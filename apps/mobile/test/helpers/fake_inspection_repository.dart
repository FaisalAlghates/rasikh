import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:rasikh/data/evidence_camera.dart';
import 'package:rasikh/data/evidence_queue.dart';
import 'package:rasikh/data/inspection_models.dart';
import 'package:rasikh/data/inspection_repository.dart';
import 'package:rasikh/data/ops_models.dart' show Doc;
import 'package:rasikh/domain/inspection.dart';

/// In-memory stand-in for Firestore, Storage and the signInspection function. It enforces the same rules
/// the real backend does: drafts only for evidence, owner signs first, complete checklist, photos for defects.
class FakeInspectionRepository implements InspectionRepository {
  final _changes = StreamController<void>.broadcast();
  final _inspections = <String, InspectionDoc>{};
  final _items = <String, Map<String, InspectionItem>>{};
  final _media = <String, List<Doc<EvidenceMeta>>>{};
  final files = <String, Uint8List>{};
  int _seq = 0;

  final calls = <String>[];

  /// While true every upload fails, like a phone without a connection.
  bool offline = false;

  /// Which party the signed-in test user is. The real server decides this from the account.
  String signAs = 'owner';
  String? failNextSignWith;

  Stream<List<T>> _live<T>(List<T> Function() read) async* {
    yield read();
    await for (final _ in _changes.stream) {
      yield read();
    }
  }

  void _touch() => _changes.add(null);

  InspectionDoc _copy(
    InspectionDoc d, {
    String? status,
    SignatureInfo? owner,
    SignatureInfo? tenant,
    String? digest,
    DateTime? sealedAt,
    String? comment,
  }) => InspectionDoc(
    unitId: d.unitId,
    propertyId: d.propertyId,
    leaseId: d.leaseId,
    kind: d.kind,
    status: status ?? d.status,
    createdBy: d.createdBy,
    rooms: d.rooms,
    tenantUid: d.tenantUid,
    tenantComment: comment ?? d.tenantComment,
    moveInId: d.moveInId,
    digest: digest ?? d.digest,
    ownerSignature: owner ?? d.ownerSignature,
    tenantSignature: tenant ?? d.tenantSignature,
    createdAt: d.createdAt,
    sealedAt: sealedAt ?? d.sealedAt,
  );

  /// Puts a ready-made inspection in the store. [conditions] overrides single answers (`room__item` → condition);
  /// every other item of every room is answered "good".
  String seed({
    required String leaseId,
    String propertyId = 'prop1',
    String unitId = 'unit2',
    String kind = 'move_in',
    String status = 'draft',
    String? tenantUid,
    List<String>? rooms,
    String? moveInId,
    Map<String, String> conditions = const {},
    bool answerAll = true,
    DateTime? sealedAt,
    SignatureInfo? owner,
    SignatureInfo? tenant,
    String? digest,
  }) {
    final id = 'insp${++_seq}';
    final r =
        rooms ??
        templateFor('apartment', bedrooms: 1).map((x) => x.key).toList();
    _inspections[id] = InspectionDoc(
      unitId: unitId,
      propertyId: propertyId,
      leaseId: leaseId,
      kind: kind,
      status: status,
      createdBy: 'owner1',
      rooms: r,
      tenantUid: tenantUid,
      moveInId: moveInId,
      digest: digest,
      ownerSignature: owner,
      tenantSignature: tenant,
      createdAt: DateTime.utc(2026, 10, 12, 9),
      sealedAt: sealedAt,
    );
    if (answerAll) {
      final items = <String, InspectionItem>{};
      for (final room in r) {
        for (final it in itemsOfRoom(room)) {
          final key = itemId(room, it);
          items[key] = InspectionItem(
            room: room,
            item: it,
            condition: conditions[key] ?? 'good',
          );
        }
      }
      _items[id] = items;
    }
    _touch();
    return id;
  }

  InspectionDoc? get(String id) => _inspections[id];
  List<EvidenceMeta> mediaOf(String id) => [
    for (final d in _media[id] ?? const <Doc<EvidenceMeta>>[]) d.data,
  ];
  Map<String, InspectionItem> itemsOf(String id) => _items[id] ?? const {};
  List<String> get ids => _inspections.keys.toList();

  @override
  Stream<List<Doc<InspectionDoc>>> inspections(
    String orgId, {
    String? tenantUid,
  }) => _live(
    () => [
      for (final e in _inspections.entries)
        if (tenantUid == null || e.value.tenantUid == tenantUid)
          Doc(e.key, e.value),
    ],
  );

  @override
  Stream<List<Doc<InspectionItem>>> items(String orgId, String inspectionId) =>
      _live(
        () => [
          for (final e in (_items[inspectionId] ?? const {}).entries)
            Doc(e.key, e.value),
        ],
      );

  @override
  Stream<List<Doc<EvidenceMeta>>> media(String orgId, String inspectionId) =>
      _live(() => List.of(_media[inspectionId] ?? const []));

  @override
  Future<String> createInspection(
    String orgId,
    String uid,
    NewInspection d,
  ) async {
    calls.add('create:${d.kind}');
    final id = 'insp${++_seq}';
    _inspections[id] = InspectionDoc(
      unitId: d.unitId,
      propertyId: d.propertyId,
      leaseId: d.leaseId,
      kind: d.kind,
      status: 'draft',
      createdBy: uid,
      rooms: d.rooms,
      tenantUid: d.tenantUid,
      moveInId: d.moveInId,
      createdAt: DateTime.now(),
    );
    _touch();
    return id;
  }

  @override
  Future<void> saveItem(
    String orgId,
    String inspectionId,
    InspectionItem item,
  ) async {
    final insp = _inspections[inspectionId]!;
    if (!insp.isDraft) throw StateError('frozen');
    calls.add('item:${item.id}:${item.condition}');
    (_items[inspectionId] ??= {})[item.id] = item;
    _touch();
  }

  @override
  Future<void> saveTenantComment(
    String orgId,
    String inspectionId,
    String comment,
  ) async {
    calls.add('comment');
    _inspections[inspectionId] = _copy(
      _inspections[inspectionId]!,
      comment: comment,
    );
    _touch();
  }

  @override
  Future<void> uploadEvidence(PendingEvidence e, Uint8List bytes) async {
    if (offline) throw Exception('offline');
    final insp = _inspections[e.inspectionId];
    if (insp == null || !insp.isDraft) throw const EvidenceRejected();
    final path = 'orgs/${e.orgId}/inspections/${e.inspectionId}/${e.id}.jpg';
    files[path] = bytes;
    final list = _media[e.inspectionId] ??= [];
    if (!list.any((d) => d.id == e.id)) {
      list.add(
        Doc(
          e.id,
          EvidenceMeta(
            room: e.room,
            item: e.item,
            path: path,
            sha256: e.sha256,
            size: e.size,
            capturedAt: e.capturedAt,
            gps: e.gps,
            device: e.device,
            uploadedBy: e.uid,
          ),
        ),
      );
    }
    calls.add('upload:${e.id}');
    _touch();
  }

  @override
  Future<Uint8List> downloadEvidence(String path) async {
    final f = files[path];
    if (f == null) throw StateError('missing');
    return f;
  }

  @override
  Future<SignResult> sign(String orgId, String inspectionId) async {
    final failure = failNextSignWith;
    if (failure != null) {
      failNextSignWith = null;
      throw SignFailure(failure);
    }
    final insp = _inspections[inspectionId]!;
    if (insp.isSealed) throw const SignFailure('already_sealed');
    if (signAs == 'tenant' && insp.ownerSignature == null) {
      throw const SignFailure('owner_must_sign_first');
    }
    final items = _items[inspectionId] ?? const {};
    if (items.length < insp.totalItems) {
      throw const SignFailure('checklist_incomplete');
    }
    final media = _media[inspectionId] ?? const [];
    for (final i in items.values) {
      if (conditionRank(i.condition) >= conditionRank('poor') &&
          !media.any((m) => m.data.room == i.room && m.data.item == i.item)) {
        throw const SignFailure('evidence_missing');
      }
    }
    for (final m in media) {
      if (sha256Hex(files[m.data.path] ?? Uint8List(0)) != m.data.sha256) {
        throw const SignFailure('media_hash_mismatch');
      }
    }
    final digest = inspectionDigest(
      inspectionId: inspectionId,
      kind: insp.kind,
      unitId: insp.unitId,
      leaseId: insp.leaseId,
      items: [
        for (final i in items.values)
          DigestItem(
            id: i.id,
            condition: i.condition,
            note: i.note,
            assessment: i.assessment,
            costSar: i.costSar,
          ),
      ],
      media: [
        for (final m in media)
          DigestMedia(
            id: m.id,
            room: m.data.room,
            item: m.data.item,
            sha256: m.data.sha256,
            capturedAt: m.data.capturedAt,
          ),
      ],
    );
    final sig = SignatureInfo(
      uid: signAs,
      digest: digest,
      at: DateTime.utc(2026, 10, 12, 10),
    );
    final sealed = signAs == 'tenant';
    _inspections[inspectionId] = _copy(
      insp,
      status: sealed ? 'sealed' : 'pending_signatures',
      owner: signAs == 'owner' ? sig : null,
      tenant: signAs == 'tenant' ? sig : null,
      digest: digest,
      sealedAt: sealed ? DateTime.utc(2026, 10, 12, 10) : null,
    );
    calls.add('sign:$signAs');
    _touch();
    return SignResult(sealed ? 'sealed' : 'pending_signatures', signAs);
  }
}

/// A camera that hands out prepared photos instead of opening hardware.
class FakeEvidenceCamera implements EvidenceCamera {
  final photos = <CapturedPhoto>[];
  int calls = 0;

  static CapturedPhoto photo(int n, {Gps? gps}) => CapturedPhoto(
    bytes: Uint8List.fromList([for (var i = 0; i < 64; i++) (i * 7 + n) % 256]),
    capturedAt: DateTime.utc(2026, 10, 12, 8, 30, n),
    gps: gps ?? const Gps(24.7136, 46.6753, 5),
    device: 'test-phone',
  );

  @override
  Future<CapturedPhoto?> capture(BuildContext context) async {
    calls++;
    return photos.isEmpty ? null : photos.removeAt(0);
  }
}
