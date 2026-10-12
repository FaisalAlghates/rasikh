import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../domain/inspection.dart';
import 'inspection_models.dart';

/// A photo taken in the app: bytes plus everything recorded at the moment of capture.
class CapturedPhoto {
  const CapturedPhoto({
    required this.bytes,
    required this.capturedAt,
    this.gps,
    this.device = '',
  });
  final Uint8List bytes;
  final DateTime capturedAt;
  final Gps? gps;
  final String device;
}

/// One photo waiting to be uploaded. The hash, time and place are fixed at capture, so an upload that
/// happens minutes or days later (after the phone was offline) still proves when and where it was taken.
class PendingEvidence {
  const PendingEvidence({
    required this.id,
    required this.orgId,
    required this.inspectionId,
    required this.room,
    this.item,
    required this.sha256,
    required this.size,
    required this.capturedAt,
    this.gps,
    required this.device,
    required this.uid,
    this.attempts = 0,
  });

  final String id, orgId, inspectionId, room, sha256, capturedAt, device, uid;
  final String? item;
  final int size, attempts;
  final Gps? gps;

  PendingEvidence withAttempts(int n) => PendingEvidence(
    id: id,
    orgId: orgId,
    inspectionId: inspectionId,
    room: room,
    item: item,
    sha256: sha256,
    size: size,
    capturedAt: capturedAt,
    gps: gps,
    device: device,
    uid: uid,
    attempts: n,
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'orgId': orgId,
    'inspectionId': inspectionId,
    'room': room,
    'item': item,
    'sha256': sha256,
    'size': size,
    'capturedAt': capturedAt,
    'gps': gps?.toMap(),
    'device': device,
    'uid': uid,
    'attempts': attempts,
  };

  factory PendingEvidence.fromJson(Map<String, Object?> j) => PendingEvidence(
    id: j['id'] as String,
    orgId: j['orgId'] as String,
    inspectionId: j['inspectionId'] as String,
    room: j['room'] as String,
    item: j['item'] as String?,
    sha256: j['sha256'] as String,
    size: (j['size'] as num).toInt(),
    capturedAt: j['capturedAt'] as String,
    gps: Gps.fromObject(j['gps']),
    device: (j['device'] as String?) ?? '',
    uid: j['uid'] as String,
    attempts: (j['attempts'] as num?)?.toInt() ?? 0,
  );
}

/// The upload can never succeed (for example the inspection was signed in the meantime), so retrying is pointless.
class EvidenceRejected implements Exception {
  const EvidenceRejected();
}

typedef EvidenceUploader = Future<void> Function(
  PendingEvidence entry,
  Uint8List bytes,
);

abstract class QueueStore {
  Future<List<PendingEvidence>> list();
  Future<void> put(PendingEvidence entry, Uint8List bytes);
  Future<void> update(PendingEvidence entry);
  Future<Uint8List?> bytes(String id);
  Future<void> remove(String id);
}

class MemoryQueueStore implements QueueStore {
  final _entries = <String, PendingEvidence>{};
  final _bytes = <String, Uint8List>{};

  @override
  Future<List<PendingEvidence>> list() async => _entries.values.toList();
  @override
  Future<void> put(PendingEvidence entry, Uint8List bytes) async {
    _entries[entry.id] = entry;
    _bytes[entry.id] = bytes;
  }

  @override
  Future<void> update(PendingEvidence entry) async =>
      _entries[entry.id] = entry;
  @override
  Future<Uint8List?> bytes(String id) async => _bytes[id];
  @override
  Future<void> remove(String id) async {
    _entries.remove(id);
    _bytes.remove(id);
  }
}

/// Keeps queued photos on the phone's storage so they survive the app being closed while offline.
class FileQueueStore implements QueueStore {
  Directory? _dir;

  Future<Directory> _root() async {
    final base = await getApplicationSupportDirectory();
    return _dir ??= await Directory('${base.path}/evidence_queue')
        .create(recursive: true);
  }

  @override
  Future<List<PendingEvidence>> list() async {
    final dir = await _root();
    final out = <PendingEvidence>[];
    await for (final f in dir.list()) {
      if (f is File && f.path.endsWith('.json')) {
        try {
          out.add(
            PendingEvidence.fromJson(
              jsonDecode(await f.readAsString()) as Map<String, Object?>,
            ),
          );
        } catch (_) {
          // A half-written entry is unusable; its photo would be orphaned, so drop it.
          await f.delete();
        }
      }
    }
    out.sort((a, b) => a.capturedAt.compareTo(b.capturedAt));
    return out;
  }

  @override
  Future<void> put(PendingEvidence entry, Uint8List bytes) async {
    final dir = await _root();
    await File('${dir.path}/${entry.id}.jpg').writeAsBytes(bytes, flush: true);
    await update(entry);
  }

  @override
  Future<void> update(PendingEvidence entry) async {
    final dir = await _root();
    await File('${dir.path}/${entry.id}.json')
        .writeAsString(jsonEncode(entry.toJson()), flush: true);
  }

  @override
  Future<Uint8List?> bytes(String id) async {
    final f = File('${(await _root()).path}/$id.jpg');
    return await f.exists() ? f.readAsBytes() : null;
  }

  @override
  Future<void> remove(String id) async {
    final dir = await _root();
    for (final ext in ['jpg', 'json']) {
      final f = File('${dir.path}/$id.$ext');
      if (await f.exists()) await f.delete();
    }
  }
}

/// Offline-first evidence uploads: a photo is stored locally and hashed first, then uploaded whenever the
/// network allows, with exponential backoff. Order is kept, so a failure pauses the queue instead of skipping.
class EvidenceQueue {
  EvidenceQueue({
    required this.store,
    required this.uploader,
    Duration Function(int attempts)? backoff,
    void Function(Duration delay, void Function() run)? schedule,
    String Function()? newId,
  }) : _backoff = backoff ?? _defaultBackoff,
       _customSchedule = schedule,
       _newId = newId ?? _defaultId;

  final QueueStore store;
  final EvidenceUploader uploader;
  final Duration Function(int attempts) _backoff;
  final void Function(Duration, void Function())? _customSchedule;
  final String Function() _newId;
  Timer? _timer;

  /// Photos still waiting to leave the phone.
  final ValueNotifier<List<PendingEvidence>> pending = ValueNotifier(const []);

  /// Photos the server refused for good (their inspection was already signed).
  final ValueNotifier<int> rejected = ValueNotifier(0);

  Future<void>? _inflight;
  bool _disposed = false;

  static Duration _defaultBackoff(int attempts) =>
      Duration(seconds: (1 << attempts.clamp(1, 6)).clamp(2, 60));

  static int _counter = 0;
  static String _defaultId() =>
      '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}${(_counter++).toRadixString(36)}';

  Future<void> init() async {
    pending.value = await store.list();
    unawaited(flush());
  }

  /// Hashes the photo, keeps it on the phone, and starts uploading in the background.
  Future<PendingEvidence> enqueue({
    required CapturedPhoto photo,
    required String orgId,
    required String inspectionId,
    required String room,
    String? item,
    required String uid,
  }) async {
    final entry = PendingEvidence(
      id: _newId(),
      orgId: orgId,
      inspectionId: inspectionId,
      room: room,
      item: item,
      sha256: sha256Hex(photo.bytes),
      size: photo.bytes.length,
      capturedAt: isoMillis(photo.capturedAt),
      gps: photo.gps,
      device: photo.device,
      uid: uid,
    );
    await store.put(entry, photo.bytes);
    pending.value = [...pending.value, entry];
    unawaited(flush());
    return entry;
  }

  /// Tries to upload everything waiting. Safe to call at any time (app resume, "retry" button); a call made
  /// while an upload round is running joins that round instead of starting a second one.
  Future<void> flush() {
    if (_disposed) return Future.value();
    return _inflight ??= _run().whenComplete(() => _inflight = null);
  }

  Future<void> _run() async {
    final tried = <String>{};
    while (true) {
      final e = pending.value.where((p) => !tried.contains(p.id)).firstOrNull;
      if (e == null) return;
      tried.add(e.id);
      final bytes = await store.bytes(e.id);
      if (bytes == null) {
        await _drop(e.id);
        continue;
      }
      try {
        await uploader(e, bytes);
        await _drop(e.id);
      } on EvidenceRejected {
        await _drop(e.id);
        rejected.value++;
      } catch (_) {
        final next = e.withAttempts(e.attempts + 1);
        await store.update(next);
        pending.value = [
          for (final p in pending.value) p.id == e.id ? next : p,
        ];
        if (!_disposed) _scheduleFlush(_backoff(next.attempts));
        return; // probably offline: stop here and keep the order
      }
    }
  }

  void _scheduleFlush(Duration delay) {
    final custom = _customSchedule;
    if (custom != null) {
      custom(delay, () => unawaited(flush()));
      return;
    }
    _timer?.cancel();
    _timer = Timer(delay, () => unawaited(flush()));
  }

  Future<void> _drop(String id) async {
    await store.remove(id);
    pending.value = [
      for (final p in pending.value)
        if (p.id != id) p,
    ];
  }

  void dispose() {
    _disposed = true;
    _timer?.cancel();
    pending.dispose();
    rejected.dispose();
  }
}
