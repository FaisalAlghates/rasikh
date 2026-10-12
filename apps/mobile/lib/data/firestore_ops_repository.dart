import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

import '../domain/domain.dart';
import 'ops_models.dart';
import 'ops_repository.dart';

class FirestoreOpsRepository implements OpsRepository {
  FirestoreOpsRepository({FirebaseFirestore? db, FirebaseFunctions? functions})
    : _db = db ?? FirebaseFirestore.instance,
      _functions =
          functions ?? FirebaseFunctions.instanceFor(region: 'me-central2');

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<Map<String, Object?>> _col(String orgId, String name) =>
      _db.collection('orgs/$orgId/$name');

  Stream<List<Doc<T>>> _watch<T>(
    Query<Map<String, Object?>> q,
    T Function(Map<String, Object?>) parse,
  ) => q.snapshots().map(
    (s) => [for (final d in s.docs) Doc(d.id, parse(d.data()))],
  );

  @override
  Stream<List<Doc<Property>>> properties(String orgId) =>
      _watch(_col(orgId, 'properties'), Property.fromMap);

  @override
  Stream<List<Doc<RentalUnit>>> units(String orgId) =>
      _watch(_col(orgId, 'units'), RentalUnit.fromMap);

  Query<Map<String, Object?>> _scoped(
    String orgId,
    String name,
    String? tenantUid,
  ) => tenantUid == null
      ? _col(orgId, name)
      : _col(orgId, name).where('tenantUid', isEqualTo: tenantUid);

  @override
  Stream<List<Doc<Lease>>> leases(String orgId, {String? tenantUid}) =>
      _watch(_scoped(orgId, 'leases', tenantUid), Lease.fromMap);

  @override
  Stream<List<Doc<Payment>>> payments(String orgId, {String? tenantUid}) =>
      _watch(_scoped(orgId, 'payments', tenantUid), Payment.fromMap);

  @override
  Stream<List<Doc<Expense>>> expenses(String orgId) =>
      _watch(_col(orgId, 'expenses'), Expense.fromMap);

  @override
  Future<void> addProperty(String orgId, Property property) => _col(
    orgId,
    'properties',
  ).add({...property.toMap(), 'createdAt': FieldValue.serverTimestamp()});

  @override
  Future<void> addUnit(String orgId, RentalUnit unit) => _col(
    orgId,
    'units',
  ).add({...unit.toMap(), 'createdAt': FieldValue.serverTimestamp()});

  @override
  Future<({String leaseId, InviteStatus? invite})> createLease(
    String orgId,
    Lease lease,
  ) async {
    final batch = _db.batch();
    final leaseRef = _col(orgId, 'leases').doc();
    batch.set(leaseRef, {
      ...lease.toMap(),
      'status': 'active',
      'createdAt': FieldValue.serverTimestamp(),
    });
    for (final i in buildSchedule(
      startDate: lease.startDate,
      endDate: lease.endDate,
      annualRent: lease.annualRent,
      cycle: lease.cycle,
    )) {
      batch.set(_col(orgId, 'payments').doc(), {
        'leaseId': leaseRef.id,
        'unitId': lease.unitId,
        'dueDate': i.dueDate,
        'amount': i.amount,
        'status': 'due',
      });
    }
    await batch.commit();

    InviteStatus? invite;
    final email = lease.tenantEmail;
    if (email != null) {
      try {
        invite = await inviteTenant(orgId, leaseRef.id, email);
      } catch (_) {
        // The lease is saved; the owner can invite again from the lease page.
      }
    }
    return (leaseId: leaseRef.id, invite: invite);
  }

  @override
  Future<InviteStatus> inviteTenant(
    String orgId,
    String leaseId,
    String email,
  ) async {
    final r = await _functions.httpsCallable('inviteTenant').call({
      'orgId': orgId,
      'leaseId': leaseId,
      'email': email,
    });
    final status = (r.data as Map)['status'];
    return status == 'linked' ? InviteStatus.linked : InviteStatus.pending;
  }

  @override
  Future<void> markPaid(String orgId, String paymentId, String paidAt) => _col(
    orgId,
    'payments',
  ).doc(paymentId).update({'status': 'paid', 'paidAt': paidAt});

  @override
  Future<void> addExpense(String orgId, Expense expense) => _col(
    orgId,
    'expenses',
  ).add({...expense.toMap(), 'createdAt': FieldValue.serverTimestamp()});
}
