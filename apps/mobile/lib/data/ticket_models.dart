import '../domain/maintenance.dart';

class TicketDoc {
  const TicketDoc({
    required this.unitId,
    required this.propertyId,
    this.leaseId,
    required this.title,
    this.description = '',
    required this.category,
    required this.urgency,
    required this.status,
    required this.suggestedParty,
    this.vendorName,
    this.vendorPhone,
    this.resolution,
    this.rating,
    this.createdAtIso,
    this.resolvedAtIso,
  });

  final String unitId,
      propertyId,
      title,
      description,
      category,
      urgency,
      status,
      suggestedParty;
  final String? leaseId,
      vendorName,
      vendorPhone,
      resolution,
      createdAtIso,
      resolvedAtIso;
  final int? rating;

  SlaState? sla(String nowIso) => createdAtIso == null || status == 'cancelled'
      ? null
      : slaState(urgency, createdAtIso!, nowIso, resolvedAtIso);

  factory TicketDoc.fromMap(Map<String, Object?> m) => TicketDoc(
    unitId: (m['unitId'] as String?) ?? '',
    propertyId: (m['propertyId'] as String?) ?? '',
    leaseId: m['leaseId'] as String?,
    title: (m['title'] as String?) ?? '',
    description: (m['description'] as String?) ?? '',
    category: (m['category'] as String?) ?? 'other',
    urgency: (m['urgency'] as String?) ?? 'normal',
    status: (m['status'] as String?) ?? 'open',
    suggestedParty: (m['suggestedParty'] as String?) ?? 'owner',
    vendorName: m['vendorName'] as String?,
    vendorPhone: m['vendorPhone'] as String?,
    resolution: m['resolution'] as String?,
    rating: (m['rating'] as num?)?.toInt(),
    createdAtIso: m['createdAtIso'] as String?,
    resolvedAtIso: m['resolvedAtIso'] as String?,
  );
}

class NewTicket {
  const NewTicket({
    required this.unitId,
    required this.propertyId,
    required this.leaseId,
    required this.title,
    this.description = '',
    required this.category,
    required this.urgency,
  });
  final String unitId,
      propertyId,
      leaseId,
      title,
      description,
      category,
      urgency;

  Map<String, Object?> toMap() => {
    'unitId': unitId,
    'propertyId': propertyId,
    'leaseId': leaseId,
    'title': title,
    'description': description,
    'category': category,
    'urgency': urgency,
  };
}

/// The server refused a ticket action; [code] is its machine message (for example `transition_not_allowed`).
class TicketFailure implements Exception {
  const TicketFailure(this.code);
  final String code;
}
