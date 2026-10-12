import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart' as crypto;

// Dart port of packages/shared/src/inspection.ts. test/inspection_domain_test.dart pins the same golden
// digest as the TypeScript test, so a photo hashed or a digest computed on either side always agrees.

const inspectionKinds = ['move_in', 'move_out'];
const inspectionStatuses = ['draft', 'pending_signatures', 'sealed'];

/// Ordered from best to worst; a higher rank is a worse condition.
const conditions = ['good', 'fair', 'poor', 'damaged'];
int conditionRank(String c) => conditions.indexOf(c);

const assessments = ['wear', 'damage'];

/// A signature needs a sign-in no older than this (the sign-off OTP / password step).
const signMaxAuthAgeSeconds = 300;

// ---------------------------------------------------------------- templates

const _items = <String, List<String>>{
  'entrance': ['door', 'lock', 'intercom', 'floor', 'lighting'],
  'living': [
    'walls',
    'floor',
    'ceiling',
    'windows',
    'lighting',
    'outlets',
    'ac',
  ],
  'majlis': [
    'walls',
    'floor',
    'ceiling',
    'windows',
    'lighting',
    'outlets',
    'ac',
  ],
  'bedroom': [
    'walls',
    'floor',
    'ceiling',
    'doors',
    'windows',
    'lighting',
    'outlets',
    'ac',
    'wardrobe',
  ],
  'kitchen': [
    'walls',
    'floor',
    'ceiling',
    'cabinets',
    'countertop',
    'sink',
    'faucet',
    'hookup',
    'exhaust',
    'lighting',
    'outlets',
  ],
  'bathroom': [
    'walls',
    'floor',
    'ceiling',
    'toilet',
    'basin',
    'faucet',
    'shower',
    'heater',
    'exhaust',
    'door',
  ],
  'balcony': ['floor', 'railing', 'door'],
  'yard': ['fence', 'gate', 'ground'],
  'parking': ['ground', 'gate'],
  'roof': ['waterproofing', 'access', 'tank'],
  'meters': ['electricity', 'water', 'gas'],
};

final roomBases = List<String>.unmodifiable(_items.keys);
final allItemKeys = List<String>.unmodifiable(
  ({for (final l in _items.values) ...l}.toList()..sort()),
);

class TemplateRoom {
  const TemplateRoom(this.key, this.items);
  final String key;
  final List<String> items;
}

/// `bedroom_2` → (base: bedroom, index: 2); `kitchen` → (base: kitchen, index: null).
({String base, int? index}) splitRoomKey(String key) {
  final m = RegExp(r'^([a-z]+)(?:_(\d+))?$').firstMatch(key);
  final base = m?.group(1);
  if (base == null || !_items.containsKey(base)) {
    throw ArgumentError('unknown room: $key');
  }
  final idx = m!.group(2);
  return (base: base, index: idx == null ? null : int.parse(idx));
}

List<String> itemsOfRoom(String key) => _items[splitRoomKey(key).base]!;

TemplateRoom _room(String base) => TemplateRoom(base, _items[base]!);
List<TemplateRoom> _numbered(String base, int n) => [
  for (var i = 1; i <= n; i++) TemplateRoom('${base}_$i', _items[base]!),
];
int _clamp(int? n, int d, int max) => (n ?? d).clamp(1, max);

/// Room-by-room checklist for a unit type: studio, apartment or villa.
List<TemplateRoom> templateFor(String type, {int? bedrooms, int? bathrooms}) =>
    switch (type) {
      'studio' => [
        _room('entrance'),
        _room('living'),
        _room('kitchen'),
        ..._numbered('bathroom', 1),
        _room('meters'),
      ],
      'villa' => [
        _room('entrance'),
        _room('majlis'),
        _room('living'),
        ..._numbered('bedroom', _clamp(bedrooms, 4, 12)),
        _room('kitchen'),
        ..._numbered('bathroom', _clamp(bathrooms, 3, 10)),
        _room('yard'),
        _room('parking'),
        _room('roof'),
        _room('meters'),
      ],
      _ => [
        _room('entrance'),
        _room('living'),
        ..._numbered('bedroom', _clamp(bedrooms, 2, 8)),
        _room('kitchen'),
        ..._numbered('bathroom', _clamp(bathrooms, 1, 6)),
        _room('balcony'),
        _room('meters'),
      ],
    };

/// Firestore document id of an item. Room and item keys never contain a double underscore.
String itemId(String room, String item) => '${room}__$item';

/// ISO 8601 UTC with exactly three fraction digits ("2026-10-12T08:30:07.000Z"): the format the security rules and the digest expect.
String isoMillis(DateTime t) {
  final u = t.toUtc();
  String p(int n, int w) => n.toString().padLeft(w, '0');
  return '${p(u.year, 4)}-${p(u.month, 2)}-${p(u.day, 2)}T${p(u.hour, 2)}:${p(u.minute, 2)}:${p(u.second, 2)}.${p(u.millisecond, 3)}Z';
}

// ---------------------------------------------------------------- hashing and digest

String sha256Hex(List<int> data) => crypto.sha256.convert(data).toString();

/// True when [data] still hashes to [expected]. A single flipped byte makes this false.
bool matchesHash(List<int> data, String expected) =>
    sha256Hex(data) == expected.toLowerCase();

String _num(num n) {
  if (n is int) return n.toString();
  final d = n.toDouble();
  return d == d.truncateToDouble() && d.abs() < 1e21
      ? d.toInt().toString()
      : d.toString();
}

/// JSON with sorted keys and no whitespace, byte-identical to the TypeScript canonicalJson.
String canonicalJson(Object? value) {
  if (value == null) return 'null';
  if (value is num) return _num(value);
  if (value is String || value is bool) return jsonEncode(value);
  if (value is List) return '[${value.map(canonicalJson).join(',')}]';
  final map = value as Map;
  final keys = map.keys.cast<String>().where((k) => map[k] != null).toList()
    ..sort();
  return '{${keys.map((k) => '${jsonEncode(k)}:${canonicalJson(map[k])}').join(',')}}';
}

class DigestItem {
  const DigestItem({
    required this.id,
    required this.condition,
    this.note = '',
    this.assessment,
    this.costSar,
  });
  final String id, condition, note;
  final String? assessment;
  final double? costSar;

  Map<String, Object?> toMap() => {
    'id': id,
    'condition': condition,
    'note': note,
    'assessment': assessment,
    'costSar': costSar,
  };
}

class DigestMedia {
  const DigestMedia({
    required this.id,
    required this.room,
    this.item,
    required this.sha256,
    required this.capturedAt,
  });
  final String id, room, sha256, capturedAt;
  final String? item;

  Map<String, Object?> toMap() => {
    'id': id,
    'room': room,
    'item': item,
    'sha256': sha256,
    'capturedAt': capturedAt,
  };
}

/// Fingerprint of everything a signature covers: every checklist answer and every photo hash.
String inspectionDigest({
  required String inspectionId,
  required String kind,
  required String unitId,
  required String leaseId,
  required List<DigestItem> items,
  required List<DigestMedia> media,
}) {
  final sortedItems = [...items]..sort((a, b) => a.id.compareTo(b.id));
  final sortedMedia = [...media]..sort((a, b) => a.id.compareTo(b.id));
  final json = canonicalJson({
    'inspectionId': inspectionId,
    'kind': kind,
    'unitId': unitId,
    'leaseId': leaseId,
    'items': [for (final i in sortedItems) i.toMap()],
    'media': [for (final m in sortedMedia) m.toMap()],
  });
  return sha256Hex(Uint8List.fromList(utf8.encode(json)));
}

// ---------------------------------------------------------------- move-out comparison

class ConditionRow {
  const ConditionRow({
    required this.room,
    required this.item,
    required this.condition,
    this.note,
    this.assessment,
    this.costSar,
  });
  final String room, item, condition;
  final String? note, assessment;
  final double? costSar;
}

enum ChangeKind { same, worse, better, added, missing }

class CompareRow {
  const CompareRow(
    this.id,
    this.room,
    this.item,
    this.before,
    this.after,
    this.change,
  );
  final String id, room, item;
  final ConditionRow? before, after;
  final ChangeKind change;
}

/// Row-by-row comparison of a move-in and a move-out. Only the move-out carries the human assessment.
List<CompareRow> compareInspections(
  List<ConditionRow> moveIn,
  List<ConditionRow> moveOut,
) {
  final before = {for (final r in moveIn) itemId(r.room, r.item): r};
  final after = {for (final r in moveOut) itemId(r.room, r.item): r};
  final ids = {...before.keys, ...after.keys}.toList()..sort();
  return [
    for (final id in ids)
      () {
        final b = before[id];
        final a = after[id];
        final any = (a ?? b)!;
        final ChangeKind change;
        if (b != null && a != null) {
          final d = conditionRank(a.condition) - conditionRank(b.condition);
          change = d > 0
              ? ChangeKind.worse
              : d < 0
              ? ChangeKind.better
              : ChangeKind.same;
        } else {
          change = a != null ? ChangeKind.added : ChangeKind.missing;
        }
        return CompareRow(id, any.room, any.item, b, a, change);
      }(),
  ];
}

/// Items a person should look at: they got worse since move-in.
List<CompareRow> needsAssessment(List<CompareRow> rows) =>
    rows.where((r) => r.change == ChangeKind.worse).toList();

/// Sum of costs marked as tenant damage, in exact halalas. Wear and unmarked items count for nothing.
double damageTotal(List<CompareRow> rows) {
  var cents = 0;
  for (final r in rows) {
    if (r.after?.assessment == 'damage') {
      cents += ((r.after!.costSar ?? 0) * 100).round();
    }
  }
  return cents / 100;
}

// ---------------------------------------------------------------- property health record

enum HealthKind { leaseStarted, leaseEnded, inspectionSealed, expense }

class HealthEvent {
  const HealthEvent({
    required this.key,
    required this.date,
    required this.kind,
    required this.refId,
    this.unitLabel,
    this.detail,
    this.amount,
  });
  final String key, date, refId;
  final HealthKind kind;
  final String? unitLabel, detail;
  final double? amount;
}

class TimelineLease {
  const TimelineLease(
    this.id,
    this.propertyId,
    this.startDate,
    this.endDate, {
    this.unitLabel,
    this.status,
  });
  final String id, propertyId, startDate, endDate;
  final String? unitLabel, status;
}

class TimelineInspection {
  const TimelineInspection(
    this.id,
    this.propertyId,
    this.kind,
    this.status, {
    this.sealedOn,
    this.unitLabel,
  });
  final String id, propertyId, kind, status;
  final String? sealedOn, unitLabel;
}

class TimelineExpense {
  const TimelineExpense(
    this.id,
    this.propertyId,
    this.date,
    this.category,
    this.amount,
  );
  final String id, propertyId, date, category;
  final double amount;
}

/// One chronological story of a property, computed from the records each module already keeps. Newest first.
List<HealthEvent> buildTimeline(
  String propertyId, {
  required String today,
  required List<TimelineLease> leases,
  required List<TimelineInspection> inspections,
  required List<TimelineExpense> expenses,
}) {
  final out = <HealthEvent>[];
  for (final l in leases.where((x) => x.propertyId == propertyId)) {
    if (l.startDate.compareTo(today) <= 0) {
      out.add(
        HealthEvent(
          key: 'lease-start-${l.id}',
          date: l.startDate,
          kind: HealthKind.leaseStarted,
          refId: l.id,
          unitLabel: l.unitLabel,
        ),
      );
    }
    if (l.endDate.compareTo(today) <= 0 || l.status == 'ended') {
      out.add(
        HealthEvent(
          key: 'lease-end-${l.id}',
          date: l.endDate,
          kind: HealthKind.leaseEnded,
          refId: l.id,
          unitLabel: l.unitLabel,
        ),
      );
    }
  }
  for (final i in inspections.where(
    (x) =>
        x.propertyId == propertyId &&
        x.status == 'sealed' &&
        x.sealedOn != null,
  )) {
    out.add(
      HealthEvent(
        key: 'inspection-${i.id}',
        date: i.sealedOn!,
        kind: HealthKind.inspectionSealed,
        refId: i.id,
        detail: i.kind,
        unitLabel: i.unitLabel,
      ),
    );
  }
  for (final e in expenses.where((x) => x.propertyId == propertyId)) {
    out.add(
      HealthEvent(
        key: 'expense-${e.id}',
        date: e.date,
        kind: HealthKind.expense,
        refId: e.id,
        detail: e.category,
        amount: e.amount,
      ),
    );
  }
  out.sort((a, b) {
    final c = b.date.compareTo(a.date);
    return c != 0 ? c : a.key.compareTo(b.key);
  });
  return out;
}
