import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/calendar_exporter.dart';
import '../data/firestore_ops_repository.dart';
import '../data/ops_models.dart';
import '../data/ops_repository.dart';
import 'providers.dart';

final opsRepositoryProvider = Provider<OpsRepository>(
  (ref) => FirestoreOpsRepository(),
);

final calendarExporterProvider = Provider<CalendarExporter>(
  (ref) => const ShareCalendarExporter(),
);

/// Who is looking at which organization. Staff read the whole org; a tenant reads only their own lease.
class OpsScope {
  const OpsScope(
    this.orgId,
    this.uid,
    this.staff, {
    this.vendor = false,
    this.unitOwner = false,
  });
  final String orgId, uid;
  final bool staff;

  /// A vendor with their own login (sees only tickets assigned to them) / an owner of a unit in an association.
  final bool vendor, unitOwner;

  @override
  bool operator ==(Object other) =>
      other is OpsScope &&
      other.orgId == orgId &&
      other.uid == uid &&
      other.staff == staff &&
      other.vendor == vendor &&
      other.unitOwner == unitOwner;
  @override
  int get hashCode => Object.hash(orgId, uid, staff, vendor, unitOwner);
}

final opsScopeProvider = Provider<OpsScope?>((ref) {
  final s = ref.watch(sessionProvider).value;
  final org = s?.activeOrgId;
  if (s == null || org == null) return null;
  return OpsScope(
    org,
    s.uid,
    s.isStaff,
    vendor:
        !s.isStaff && s.roles.contains('vendor') && !s.roles.contains('tenant'),
    unitOwner: !s.isStaff && s.roles.contains('building_owner'),
  );
});

// A failed query (for example a rules denial) must not retry in a loop.
StreamProvider<List<Doc<T>>> _collection<T>(
  Stream<List<Doc<T>>> Function(OpsRepository repo, OpsScope scope) open, {
  bool staffOnly = false,
}) => StreamProvider.autoDispose<List<Doc<T>>>((ref) {
  final scope = ref.watch(opsScopeProvider);
  if (scope == null || (staffOnly && !scope.staff)) {
    return Stream.value(const []);
  }
  return open(ref.watch(opsRepositoryProvider), scope);
}, retry: (_, _) => null);

final _properties = _collection<Property>(
  (r, s) => r.properties(s.orgId),
  staffOnly: true,
);
final _units = _collection<RentalUnit>(
  (r, s) => r.units(s.orgId),
  staffOnly: true,
);
final _expenses = _collection<Expense>(
  (r, s) => r.expenses(s.orgId),
  staffOnly: true,
);
final _leases = _collection<Lease>(
  (r, s) => r.leases(s.orgId, tenantUid: s.staff ? null : s.uid),
);
final _payments = _collection<Payment>(
  (r, s) => r.payments(s.orgId, tenantUid: s.staff ? null : s.uid),
);

/// All the records this session can see, combined. Loading until each collection has answered once.
final opsDataProvider = Provider.autoDispose<AsyncValue<OpsData>>((ref) {
  final p = ref.watch(_properties);
  final u = ref.watch(_units);
  final l = ref.watch(_leases);
  final pay = ref.watch(_payments);
  final e = ref.watch(_expenses);
  for (final a in [p, u, l, pay, e]) {
    if (a.hasError && !a.hasValue) {
      return AsyncError(a.error!, a.stackTrace ?? StackTrace.current);
    }
  }
  if (![p, u, l, pay, e].every((a) => a.hasValue)) {
    return const AsyncLoading();
  }
  return AsyncData(
    OpsData(
      properties: p.value!,
      units: u.value!,
      leases: l.value!,
      payments: pay.value!,
      expenses: e.value!,
    ),
  );
});
