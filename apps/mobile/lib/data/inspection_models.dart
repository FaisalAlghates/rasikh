import '../domain/inspection.dart';

DateTime? _date(Object? v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  try {
    // Firestore Timestamp; kept dynamic so the models stay free of Firebase imports.
    return (v as dynamic).toDate() as DateTime;
  } catch (_) {
    return null;
  }
}

String _s(Map<String, Object?> m, String k, [String d = '']) =>
    (m[k] as String?) ?? d;

/// Riyadh calendar day (UTC+3) of an instant, as YYYY-MM-DD.
String? riyadhDay(DateTime? t) {
  if (t == null) return null;
  final r = t.toUtc().add(const Duration(hours: 3));
  return '${r.year.toString().padLeft(4, '0')}-${r.month.toString().padLeft(2, '0')}-${r.day.toString().padLeft(2, '0')}';
}

class SignatureInfo {
  const SignatureInfo({required this.uid, required this.digest, this.at});
  final String uid, digest;
  final DateTime? at;

  static SignatureInfo? fromObject(Object? o) {
    if (o is! Map) return null;
    return SignatureInfo(
      uid: (o['uid'] as String?) ?? '',
      digest: (o['digest'] as String?) ?? '',
      at: _date(o['at']),
    );
  }
}

class InspectionDoc {
  const InspectionDoc({
    required this.unitId,
    required this.propertyId,
    required this.leaseId,
    required this.kind,
    required this.status,
    required this.createdBy,
    required this.rooms,
    this.tenantUid,
    this.tenantComment,
    this.moveInId,
    this.digest,
    this.ownerSignature,
    this.tenantSignature,
    this.createdAt,
    this.sealedAt,
  });

  final String unitId, propertyId, leaseId, kind, status, createdBy;
  final List<String> rooms;
  final String? tenantUid, tenantComment, moveInId, digest;
  final SignatureInfo? ownerSignature, tenantSignature;
  final DateTime? createdAt, sealedAt;

  bool get isDraft => status == 'draft';
  bool get isSealed => status == 'sealed';

  int get totalItems => rooms.fold(0, (n, r) => n + itemsOfRoom(r).length);

  factory InspectionDoc.fromMap(Map<String, Object?> m) {
    final sigs = m['signatures'];
    return InspectionDoc(
      unitId: _s(m, 'unitId'),
      propertyId: _s(m, 'propertyId'),
      leaseId: _s(m, 'leaseId'),
      kind: _s(m, 'kind', 'move_in'),
      status: _s(m, 'status', 'draft'),
      createdBy: _s(m, 'createdBy'),
      rooms: [for (final r in (m['rooms'] as List? ?? const [])) r as String],
      tenantUid: m['tenantUid'] as String?,
      tenantComment: m['tenantComment'] as String?,
      moveInId: m['moveInId'] as String?,
      digest: m['digest'] as String?,
      ownerSignature: sigs is Map
          ? SignatureInfo.fromObject(sigs['owner'])
          : null,
      tenantSignature: sigs is Map
          ? SignatureInfo.fromObject(sigs['tenant'])
          : null,
      createdAt: _date(m['createdAt']),
      sealedAt: _date(m['sealedAt']),
    );
  }
}

class InspectionItem {
  const InspectionItem({
    required this.room,
    required this.item,
    required this.condition,
    this.note = '',
    this.assessment,
    this.costSar,
  });
  final String room, item, condition, note;
  final String? assessment;
  final double? costSar;

  String get id => itemId(room, item);

  factory InspectionItem.fromMap(Map<String, Object?> m) => InspectionItem(
    room: _s(m, 'room'),
    item: _s(m, 'item'),
    condition: _s(m, 'condition', 'good'),
    note: _s(m, 'note'),
    assessment: m['assessment'] as String?,
    costSar: (m['costSar'] as num?)?.toDouble(),
  );

  /// Only the fields the security rules accept; the assessment exists at move-out only.
  Map<String, Object?> toMap() => {
    'room': room,
    'item': item,
    'condition': condition,
    'note': note,
    if (assessment != null) 'assessment': assessment,
    if (assessment == 'damage' && costSar != null) 'costSar': costSar,
  };

  ConditionRow toRow() => ConditionRow(
    room: room,
    item: item,
    condition: condition,
    note: note,
    assessment: assessment,
    costSar: costSar,
  );
}

class Gps {
  const Gps(this.lat, this.lng, [this.accuracy]);
  final double lat, lng;
  final double? accuracy;

  static Gps? fromObject(Object? o) => o is Map
      ? Gps(
          (o['lat'] as num).toDouble(),
          (o['lng'] as num).toDouble(),
          (o['accuracy'] as num?)?.toDouble(),
        )
      : null;

  Map<String, Object?> toMap() => {
    'lat': lat,
    'lng': lng,
    if (accuracy != null) 'accuracy': accuracy!.roundToDouble(),
  };
}

/// Metadata of one stored photo. Created once; the file and the record are both write-once.
class EvidenceMeta {
  const EvidenceMeta({
    required this.room,
    this.item,
    required this.path,
    required this.sha256,
    required this.size,
    required this.capturedAt,
    this.gps,
    this.device = '',
    this.uploadedBy = '',
  });
  final String room, path, sha256, capturedAt, device, uploadedBy;
  final String? item;
  final int size;
  final Gps? gps;

  factory EvidenceMeta.fromMap(Map<String, Object?> m) => EvidenceMeta(
    room: _s(m, 'room'),
    item: m['item'] as String?,
    path: _s(m, 'path'),
    sha256: _s(m, 'sha256'),
    size: (m['size'] as num?)?.toInt() ?? 0,
    capturedAt: _s(m, 'capturedAt'),
    gps: Gps.fromObject(m['gps']),
    device: _s(m, 'device'),
    uploadedBy: _s(m, 'uploadedBy'),
  );
}

class NewInspection {
  const NewInspection({
    required this.unitId,
    required this.propertyId,
    required this.leaseId,
    this.tenantUid,
    required this.kind,
    required this.rooms,
    this.moveInId,
  });
  final String unitId, propertyId, leaseId, kind;
  final String? tenantUid, moveInId;
  final List<String> rooms;
}
