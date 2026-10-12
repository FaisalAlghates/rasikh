// Dart port of packages/shared/src/maintenance.ts (same rules, same fixtures in test/maintenance_domain_test.dart).

const ticketCategories = [
  'consumables',
  'tenant_damage',
  'plumbing',
  'electrical',
  'ac',
  'appliance',
  'structure',
  'pest',
  'other',
];
const urgencies = ['low', 'normal', 'urgent', 'emergency'];

/// A suggestion only (Ejar's general guidance): consumables and tenant-caused damage on the tenant.
String suggestResponsibility(String category) =>
    category == 'consumables' || category == 'tenant_damage'
    ? 'tenant'
    : 'owner';

const slaHours = {'emergency': 4, 'urgent': 24, 'normal': 72, 'low': 168};

enum SlaState { met, ok, dueSoon, breached }

/// `dueSoon` = under a quarter of the allowed time left; a resolved ticket is judged by when it was resolved.
SlaState slaState(
  String urgency,
  String createdAtIso,
  String nowIso, [
  String? resolvedAtIso,
]) {
  final start = DateTime.parse(createdAtIso).millisecondsSinceEpoch;
  final due = start + slaHours[urgency]! * 3600000;
  if (resolvedAtIso != null) {
    return DateTime.parse(resolvedAtIso).millisecondsSinceEpoch <= due
        ? SlaState.met
        : SlaState.breached;
  }
  final now = DateTime.parse(nowIso).millisecondsSinceEpoch;
  if (now > due) return SlaState.breached;
  return due - now < (due - start) / 4 ? SlaState.dueSoon : SlaState.ok;
}

const _rules = {
  'assign': (from: ['open', 'assigned'], to: 'assigned', by: ['staff']),
  'start': (from: ['assigned'], to: 'in_progress', by: ['staff', 'vendor']),
  'resolve': (
    from: ['assigned', 'in_progress'],
    to: 'resolved',
    by: ['staff', 'vendor'],
  ),
  'close': (from: ['resolved'], to: 'closed', by: ['tenant', 'staff']),
  'cancel': (
    from: ['open', 'assigned'],
    to: 'cancelled',
    by: ['tenant', 'staff'],
  ),
};

/// The next status, or null when the action is not allowed for this party in this status.
String? nextStatus(String from, String action, String party) {
  final r = _rules[action];
  if (r == null) return null;
  return r.from.contains(from) && r.by.contains(party) ? r.to : null;
}
