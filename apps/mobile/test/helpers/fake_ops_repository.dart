import 'dart:async';

import 'package:rasikh/data/calendar_exporter.dart';
import 'package:rasikh/data/ops_models.dart';
import 'package:rasikh/data/ops_repository.dart';
import 'package:rasikh/domain/domain.dart';

/// In-memory stand-in for Firestore: same scoping rules (a tenant only sees documents carrying their uid).
class FakeOpsRepository implements OpsRepository {
  FakeOpsRepository();

  final _changes = StreamController<void>.broadcast();
  final _props = <Doc<Property>>[];
  final _units = <Doc<RentalUnit>>[];
  final _leases = <Doc<Lease>>[];
  final _payments = <Doc<Payment>>[];
  final _expenses = <Doc<Expense>>[];
  int _seq = 0;

  final calls = <String>[];
  InviteStatus nextInvite = InviteStatus.pending;
  bool failWrites = false;

  String _id(String p) => '$p${++_seq}';

  Stream<List<T>> _live<T>(List<T> Function() read) async* {
    yield read();
    await for (final _ in _changes.stream) {
      yield read();
    }
  }

  void _touch() => _changes.add(null);

  void _guard() {
    if (failWrites) throw const OpsException();
  }

  /// Seeds a tenant-linked lease with its schedule (what the server does after an invite is claimed).
  String seedLease({
    required String tenantUid,
    String property = 'برج النخيل',
    String unit = 'شقة 3',
    String start = '2026-01-01',
    String end = '2027-01-01',
    double rent = 42000,
    PaymentCycle cycle = PaymentCycle.monthly,
    Set<String> paidDueDates = const {},
  }) {
    final lease = Lease(
      unitId: 'u-seed',
      propertyId: 'p-seed',
      ejarContractNo: '10203040',
      tenantName: 'سالم',
      propertyName: property,
      unitLabel: unit,
      startDate: start,
      endDate: end,
      annualRent: rent,
      cycle: cycle,
      tenantUid: tenantUid,
      status: 'active',
    );
    final id = _id('lease');
    _leases.add(Doc(id, lease));
    for (final i in buildSchedule(
      startDate: start,
      endDate: end,
      annualRent: rent,
      cycle: cycle,
    )) {
      _payments.add(
        Doc(
          _id('pay'),
          Payment(
            leaseId: id,
            unitId: 'u-seed',
            dueDate: i.dueDate,
            amount: i.amount,
            paid: paidDueDates.contains(i.dueDate),
            tenantUid: tenantUid,
          ),
        ),
      );
    }
    _touch();
    return id;
  }

  List<Doc<Payment>> paymentsOfLease(String leaseId) =>
      _payments.where((p) => p.data.leaseId == leaseId).toList();
  List<Doc<Lease>> get leasesNow => List.unmodifiable(_leases);
  List<Doc<Expense>> get expensesNow => List.unmodifiable(_expenses);

  @override
  Stream<List<Doc<Property>>> properties(String orgId) =>
      _live(() => List.of(_props));
  @override
  Stream<List<Doc<RentalUnit>>> units(String orgId) =>
      _live(() => List.of(_units));
  @override
  Stream<List<Doc<Lease>>> leases(String orgId, {String? tenantUid}) => _live(
    () => _leases
        .where((l) => tenantUid == null || l.data.tenantUid == tenantUid)
        .toList(),
  );
  @override
  Stream<List<Doc<Payment>>> payments(String orgId, {String? tenantUid}) =>
      _live(
        () => _payments
            .where((p) => tenantUid == null || p.data.tenantUid == tenantUid)
            .toList(),
      );
  @override
  Stream<List<Doc<Expense>>> expenses(String orgId) =>
      _live(() => List.of(_expenses));

  final designsNow = <Doc<DesignLink>>[];

  @override
  Stream<List<Doc<DesignLink>>> designs(String orgId) =>
      _live(() => List.of(designsNow));

  @override
  Future<void> addProperty(String orgId, Property property) async {
    _guard();
    calls.add('addProperty:${property.name}');
    _props.add(Doc(_id('prop'), property));
    _touch();
  }

  @override
  Future<void> addUnit(String orgId, RentalUnit unit) async {
    _guard();
    calls.add('addUnit:${unit.label}');
    _units.add(Doc(_id('unit'), unit));
    _touch();
  }

  @override
  Future<({String leaseId, InviteStatus? invite})> createLease(
    String orgId,
    Lease lease,
  ) async {
    _guard();
    calls.add('createLease:${lease.ejarContractNo}');
    final id = _id('lease');
    _leases.add(Doc(id, lease));
    for (final i in buildSchedule(
      startDate: lease.startDate,
      endDate: lease.endDate,
      annualRent: lease.annualRent,
      cycle: lease.cycle,
    )) {
      _payments.add(
        Doc(
          _id('pay'),
          Payment(
            leaseId: id,
            unitId: lease.unitId,
            dueDate: i.dueDate,
            amount: i.amount,
            paid: false,
          ),
        ),
      );
    }
    _touch();
    return (leaseId: id, invite: lease.tenantEmail == null ? null : nextInvite);
  }

  @override
  Future<InviteStatus> inviteTenant(
    String orgId,
    String leaseId,
    String email,
  ) async {
    _guard();
    calls.add('invite:$email');
    return nextInvite;
  }

  @override
  Future<void> markPaid(String orgId, String paymentId, String paidAt) async {
    _guard();
    calls.add('markPaid:$paymentId:$paidAt');
    final i = _payments.indexWhere((p) => p.id == paymentId);
    final p = _payments[i].data;
    _payments[i] = Doc(
      paymentId,
      Payment(
        leaseId: p.leaseId,
        unitId: p.unitId,
        dueDate: p.dueDate,
        amount: p.amount,
        paid: true,
        paidAt: paidAt,
        tenantUid: p.tenantUid,
      ),
    );
    _touch();
  }

  @override
  Future<void> addExpense(String orgId, Expense expense) async {
    _guard();
    calls.add('addExpense:${expense.amount}');
    _expenses.add(Doc(_id('exp'), expense));
    _touch();
  }
}

class FakeCalendarExporter implements CalendarExporter {
  final exports = <({String fileName, String ics, String title})>[];

  @override
  Future<void> export({
    required String fileName,
    required String ics,
    required String title,
  }) async {
    exports.add((fileName: fileName, ics: ics, title: title));
  }
}
