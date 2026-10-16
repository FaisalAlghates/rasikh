import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/domain/inspection.dart';

// Same fixtures as packages/shared/src/inspection.test.ts; the golden digest was produced by the TypeScript side.
void main() {
  group('templates', () {
    test('differ by unit type and honour counts', () {
      expect(templateFor('studio').map((r) => r.key), [
        'entrance',
        'living',
        'kitchen',
        'bathroom_1',
        'meters',
      ]);
      final apt = templateFor(
        'apartment',
        bedrooms: 3,
        bathrooms: 2,
      ).map((r) => r.key);
      expect(apt.where((k) => k.startsWith('bedroom')), [
        'bedroom_1',
        'bedroom_2',
        'bedroom_3',
      ]);
      expect(apt.where((k) => k.startsWith('bathroom')), [
        'bathroom_1',
        'bathroom_2',
      ]);
      final villa = templateFor('villa').map((r) => r.key).toList();
      expect(villa, containsAll(['majlis', 'yard', 'parking', 'roof']));
      expect(villa.where((k) => k.startsWith('bedroom')), hasLength(4));
    });

    test('clamp absurd counts', () {
      expect(
        templateFor(
          'apartment',
          bedrooms: 999,
        ).where((r) => r.key.startsWith('bedroom')),
        hasLength(8),
      );
      expect(
        templateFor(
          'apartment',
          bedrooms: 0,
        ).where((r) => r.key.startsWith('bedroom')),
        hasLength(1),
      );
    });

    test('keys are safe in a document id', () {
      for (final type in ['studio', 'apartment', 'villa']) {
        for (final r in templateFor(type)) {
          expect(r.key, matches(RegExp(r'^[a-z]+(_\d+)?$')));
          expect(r.key.contains('__'), isFalse);
          expect(r.items, itemsOfRoom(r.key));
        }
      }
      expect(itemId('bedroom_2', 'walls'), 'bedroom_2__walls');
      expect(splitRoomKey('bedroom_3'), (base: 'bedroom', index: 3));
      expect(() => splitRoomKey('garage'), throwsArgumentError);
      expect(allItemKeys, contains('walls'));
    });

    test('same 48-item apartment as the web app', () {
      final total = templateFor(
        'apartment',
        bedrooms: 1,
      ).fold<int>(0, (n, r) => n + r.items.length);
      expect(total, 48);
    });
  });

  test('isoMillis always has three fraction digits, whatever the platform precision', () {
    expect(
      isoMillis(DateTime.utc(2026, 10, 12, 8, 30, 7)),
      '2026-10-12T08:30:07.000Z',
    );
    expect(
      isoMillis(DateTime.utc(2026, 1, 2, 3, 4, 5, 6, 789)),
      '2026-01-02T03:04:05.006Z',
    );
    expect(
      isoMillis(DateTime.parse('2026-10-12T11:30:07+03:00')),
      '2026-10-12T08:30:07.000Z',
    );
    expect(
      RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$')
          .hasMatch(isoMillis(DateTime.now())),
      isTrue,
    );
  });

  group('hashing', () {
    test('matches the published SHA-256 vectors', () {
      expect(
        sha256Hex(utf8.encode('abc')),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
      expect(
        sha256Hex(const <int>[]),
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
    });

    test(
      'a tampered file no longer matches: one flipped byte, or a truncation',
      () {
        final photo = Uint8List.fromList([
          for (var i = 0; i < 4096; i++) (i * 31) % 251,
        ]);
        final stored = sha256Hex(photo);
        expect(matchesHash(photo, stored), isTrue);
        final tampered = Uint8List.fromList(photo)..[2048] ^= 1;
        expect(matchesHash(tampered, stored), isFalse);
        expect(matchesHash(photo.sublist(0, 4095), stored), isFalse);
      },
    );

    test('canonical JSON is byte-identical to the TypeScript output', () {
      expect(
        canonicalJson({
          'n': [1, 350.0, 350.5, 0.1],
          's': 'é/\u0007\u001f',
        }),
        r'{"n":[1,350,350.5,0.1],"s":"é/\u0007\u001f"}',
      );
      expect(
        canonicalJson({
          'b': 1,
          'a': [
            2,
            {'d': 1, 'c': null},
          ],
        }),
        '{"a":[2,{"d":1}],"b":1}',
      );
    });
  });

  group('inspection digest', () {
    const media = [
      DigestMedia(
        id: 'm1',
        room: 'kitchen',
        item: 'sink',
        sha256:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        capturedAt: '2026-10-12T08:00:00.000Z',
      ),
    ];
    final items = [
      const DigestItem(
        id: 'kitchen__sink',
        condition: 'poor',
        note: 'تسريب "بسيط"',
        assessment: 'damage',
        costSar: 350,
      ),
      const DigestItem(id: 'entrance__door', condition: 'fair'),
      const DigestItem(
        id: 'living__walls',
        condition: 'damaged',
        note: 'a\\b\nc',
        assessment: 'damage',
        costSar: 120.5,
      ),
    ];

    String digest(List<DigestItem> i, List<DigestMedia> m) => inspectionDigest(
      inspectionId: 'i1',
      kind: 'move_in',
      unitId: 'u1',
      leaseId: 'l1',
      items: i,
      media: m,
    );

    test('equals the digest computed by the TypeScript implementation', () {
      expect(
        digest(items, media),
        '8a6d6c0898039997a43e0b4c0d95934331394047efa41a9a93cbbeebd42c5c3c',
      );
    });

    test('is order-independent and changes with any edit', () {
      final a = digest(items, media);
      expect(digest(items.reversed.toList(), media), a);
      expect(
        digest([
          const DigestItem(id: 'kitchen__sink', condition: 'good'),
          ...items.skip(1),
        ], media),
        isNot(a),
      );
      expect(digest(items, const []), isNot(a));
    });
  });

  group('move-out comparison', () {
    ConditionRow row(
      String room,
      String item,
      String c, {
      String? a,
      double? cost,
    }) => ConditionRow(
      room: room,
      item: item,
      condition: c,
      assessment: a,
      costSar: cost,
    );
    final moveIn = [
      row('kitchen', 'sink', 'good'),
      row('living', 'walls', 'fair'),
      row('living', 'floor', 'good'),
      row('yard', 'gate', 'good'),
    ];
    final moveOut = [
      row('kitchen', 'sink', 'damaged', a: 'damage', cost: 350.5),
      row('living', 'walls', 'poor', a: 'wear'),
      row('living', 'floor', 'good'),
      row('bedroom_1', 'walls', 'good'),
    ];

    test('classifies every row', () {
      final rows = compareInspections(moveIn, moveOut);
      expect(
        {for (final r in rows) r.id: r.change},
        {
          'bedroom_1__walls': ChangeKind.added,
          'kitchen__sink': ChangeKind.worse,
          'living__floor': ChangeKind.same,
          'living__walls': ChangeKind.worse,
          'yard__gate': ChangeKind.missing,
        },
      );
      expect(needsAssessment(rows).map((r) => r.id), [
        'kitchen__sink',
        'living__walls',
      ]);
    });

    test('charges only what a person marked as damage, in exact halalas', () {
      expect(damageTotal(compareInspections(moveIn, moveOut)), 350.5);
      final two = compareInspections(
        [row('a', 'x', 'good'), row('b', 'y', 'good')],
        [
          row('a', 'x', 'damaged', a: 'damage', cost: 0.1),
          row('b', 'y', 'damaged', a: 'damage', cost: 0.2),
        ],
      );
      expect(damageTotal(two), 0.3);
    });
  });

  test('property health record adds design sets linked to the property', () {
    final t = buildTimeline(
      'p1',
      today: '2026-10-16',
      leases: const [],
      inspections: const [],
      expenses: const [TimelineExpense('e1', 'p1', '2026-03-01', 'fees', 10)],
      designs: const [
        TimelineDesign('d1', 'p1', '2026-10-16', 'فيلا النرجس', 'مكتب الأفق'),
        TimelineDesign('d2', 'other', '2026-10-16', 'x', 'y'),
      ],
    );
    expect(t.map((e) => e.key), ['design-d1', 'expense-e1']);
    expect(t.first.kind, HealthKind.designReleased);
    expect(t.first.label, 'فيلا النرجس · مكتب الأفق');
  });

  test('property health record merges leases, signed inspections and expenses, newest first', () {
    final t = buildTimeline(
      'p1',
      today: '2026-10-12',
      leases: const [
        TimelineLease(
          'l1',
          'p1',
          '2025-01-01',
          '2025-12-31',
          unitLabel: 'شقة 3',
        ),
        TimelineLease(
          'l2',
          'p1',
          '2026-01-01',
          '2027-01-01',
          unitLabel: 'شقة 3',
        ),
        TimelineLease('lx', 'other', '2026-01-01', '2027-01-01'),
        TimelineLease('l3', 'p1', '2027-06-01', '2028-06-01'),
      ],
      inspections: const [
        TimelineInspection(
          'i1',
          'p1',
          'move_in',
          'sealed',
          sealedOn: '2026-01-02',
        ),
        TimelineInspection('i2', 'p1', 'move_out', 'draft'),
      ],
      expenses: const [
        TimelineExpense('e1', 'p1', '2026-06-18', 'maintenance', 450),
        TimelineExpense('e2', 'other', '2026-06-18', 'fees', 1),
      ],
    );
    expect(t.map((e) => e.key), [
      'expense-e1',
      'inspection-i1',
      'lease-start-l2',
      'lease-end-l1',
      'lease-start-l1',
    ]);
    expect(t.first.amount, 450);
  });
}
