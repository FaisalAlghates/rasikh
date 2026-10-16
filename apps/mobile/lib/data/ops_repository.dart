import 'ops_models.dart';

/// What the callable `inviteTenant` reported: linked straight away, or waiting for the tenant to sign up.
enum InviteStatus { linked, pending }

class OpsException implements Exception {
  const OpsException();
}

/// Rental operations data for one organization. The Firestore implementation lives next door; tests use a fake.
abstract class OpsRepository {
  Stream<List<Doc<Property>>> properties(String orgId);
  Stream<List<Doc<RentalUnit>>> units(String orgId);

  /// Tenants must pass their own uid: the security rules only allow queries scoped to `tenantUid`.
  Stream<List<Doc<Lease>>> leases(String orgId, {String? tenantUid});
  Stream<List<Doc<Payment>>> payments(String orgId, {String? tenantUid});
  Stream<List<Doc<Expense>>> expenses(String orgId);

  /// Design sets linked to the organization's properties (shown in the Property Health Record).
  Stream<List<Doc<DesignLink>>> designs(String orgId);

  Future<void> addProperty(String orgId, Property property);
  Future<void> addUnit(String orgId, RentalUnit unit);

  /// Saves the lease and its payment schedule in one batch, then invites the tenant when an email was given.
  /// Returns the new lease id and the invite outcome (null when no email or the invite call failed).
  Future<({String leaseId, InviteStatus? invite})> createLease(
    String orgId,
    Lease lease,
  );

  Future<InviteStatus> inviteTenant(String orgId, String leaseId, String email);
  Future<void> markPaid(String orgId, String paymentId, String paidAt);
  Future<void> addExpense(String orgId, Expense expense);
}
