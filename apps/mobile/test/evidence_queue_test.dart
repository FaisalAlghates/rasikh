import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/data/evidence_queue.dart';
import 'package:rasikh/domain/inspection.dart';

import 'helpers/fake_inspection_repository.dart';

/// The offline-first evidence queue: a photo is hashed and kept on the phone first, uploaded when the network allows.
void main() {
  late MemoryQueueStore store;
  late List<PendingEvidence> uploaded;
  late bool online;
  late bool reject;
  late List<(Duration, void Function())> scheduled;
  late EvidenceQueue queue;
  var seq = 0;

  EvidenceQueue make() => EvidenceQueue(
    store: store,
    uploader: (e, bytes) async {
      if (reject) throw const EvidenceRejected();
      if (!online) throw Exception('offline');
      expect(
        sha256Hex(bytes),
        e.sha256,
        reason: 'the uploaded bytes are exactly what was hashed',
      );
      uploaded.add(e);
    },
    schedule: (d, run) => scheduled.add((d, run)),
    newId: () => 'e${++seq}',
  );

  setUp(() {
    store = MemoryQueueStore();
    uploaded = [];
    online = true;
    reject = false;
    scheduled = [];
    seq = 0;
    queue = make();
  });

  Future<PendingEvidence> shoot(
    int n, {
    String room = 'kitchen',
    String? item = 'sink',
  }) => queue.enqueue(
    photo: FakeEvidenceCamera.photo(n),
    orgId: 'o',
    inspectionId: 'i1',
    room: room,
    item: item,
    uid: 'u1',
  );

  test('hashes at capture time and records time, place and device', () async {
    final photo = FakeEvidenceCamera.photo(7);
    final e = await shoot(7);
    expect(e.sha256, sha256Hex(photo.bytes));
    expect(e.size, photo.bytes.length);
    expect(e.capturedAt, '2026-10-12T08:30:07.000Z');
    expect(e.gps?.lat, 24.7136);
    expect(e.device, 'test-phone');
  });

  test('online: uploads right away and the queue empties', () async {
    await shoot(1);
    await queue.flush();
    expect(uploaded.map((e) => e.id), ['e1']);
    expect(queue.pending.value, isEmpty);
    expect(await store.list(), isEmpty);
  });

  test('offline: the photo stays on the phone, retries back off, then everything uploads in order', () async {
    online = false;
    await shoot(1);
    await shoot(2, room: 'living', item: 'walls');
    await queue.flush();

    // nothing left the phone, both photos are kept with their hashes
    expect(uploaded, isEmpty);
    expect(queue.pending.value.map((e) => e.id), ['e1', 'e2']);
    expect((await store.list()).length, 2);
    expect(await store.bytes('e1'), isNotNull);

    // the failure was noted and a retry was scheduled with a growing delay
    expect(queue.pending.value.first.attempts, greaterThan(0));
    expect(scheduled, isNotEmpty);
    final firstDelay = scheduled.last.$1;

    await queue.flush();
    expect(scheduled.last.$1, greaterThan(firstDelay));

    // the network comes back and the scheduled retry fires
    online = true;
    scheduled.last.$2();
    await Future<void>.delayed(Duration.zero);
    await queue.flush();
    expect(uploaded.map((e) => e.id), ['e1', 'e2']); // order kept
    expect(queue.pending.value, isEmpty);
  });

  test(
    'survives the app being closed: a new queue picks up what was left',
    () async {
      online = false;
      await shoot(1);
      await queue.flush();
      final left = (await store.list()).single;
      expect(left.attempts, greaterThan(0));

      online = true;
      final reopened = make();
      await reopened.init();
      await reopened.flush();
      expect(uploaded.map((e) => e.sha256), [left.sha256]);
      expect(reopened.pending.value, isEmpty);
    },
  );

  test('a photo whose inspection was signed meanwhile is dropped, not retried forever', () async {
    reject = true;
    await shoot(1);
    await queue.flush();
    expect(queue.pending.value, isEmpty);
    expect(queue.rejected.value, 1);
    expect(scheduled, isEmpty);
    expect(await store.list(), isEmpty);
  });

  test('one failure pauses the queue instead of skipping ahead', () async {
    online = false;
    await shoot(1);
    await shoot(2);
    await shoot(3);
    online = true;
    // first attempt fails (e1), so e2 and e3 must not overtake it
    var failFirst = true;
    final q = EvidenceQueue(
      store: store,
      uploader: (e, bytes) async {
        if (e.id == 'e1' && failFirst) {
          failFirst = false;
          throw Exception('flaky');
        }
        uploaded.add(e);
      },
      schedule: (d, run) => scheduled.add((d, run)),
    );
    await q.init();
    await Future<void>.delayed(Duration.zero);
    expect(uploaded, isEmpty);
    await q.flush();
    expect(uploaded.map((e) => e.id), ['e1', 'e2', 'e3']);
  });

  test(
    'entries round-trip through JSON (what the file store writes)',
    () async {
      final e = await shoot(3);
      final back = PendingEvidence.fromJson(e.toJson());
      expect(back.sha256, e.sha256);
      expect(back.capturedAt, e.capturedAt);
      expect(back.gps?.lng, e.gps?.lng);
      expect(back.item, 'sink');
      expect(Uint8List.fromList([1]).length, 1);
    },
  );
}
