import '../domain/domain.dart';

/// A Firestore document id with its decoded data. (Named `Doc` so it never clashes with Flutter's `Row`.)
class Doc<T> {
  const Doc(this.id, this.data);
  final String id;
  final T data;
}

String _s(Map<String, Object?> m, String k, [String d = '']) =>
    (m[k] as String?) ?? d;
double _n(Map<String, Object?> m, String k) => ((m[k] as num?) ?? 0).toDouble();

class Property {
  const Property({
    required this.name,
    required this.city,
    this.district = '',
    this.address = '',
    this.kind = 'building',
  });
  final String name, city, district, address, kind;

  factory Property.fromMap(Map<String, Object?> m) => Property(
    name: _s(m, 'name'),
    city: _s(m, 'city'),
    district: _s(m, 'district'),
    address: _s(m, 'address'),
    kind: _s(m, 'kind', 'building'),
  );

  Map<String, Object?> toMap() => {
    'name': name,
    'city': city,
    'district': district,
    'address': address,
    'kind': kind,
  };
}

class RentalUnit {
  const RentalUnit({
    required this.propertyId,
    required this.label,
    required this.type,
  });
  final String propertyId, label, type;

  factory RentalUnit.fromMap(Map<String, Object?> m) => RentalUnit(
    propertyId: _s(m, 'propertyId'),
    label: _s(m, 'label'),
    type: _s(m, 'type', 'apartment'),
  );

  Map<String, Object?> toMap() => {
    'propertyId': propertyId,
    'label': label,
    'type': type,
  };
}

class Lease {
  const Lease({
    required this.unitId,
    required this.propertyId,
    required this.ejarContractNo,
    required this.tenantName,
    this.tenantEmail,
    this.propertyName,
    this.unitLabel,
    required this.startDate,
    required this.endDate,
    required this.annualRent,
    required this.cycle,
    this.depositAmount = 0,
    this.tenantUid,
    this.status,
  });
  final String unitId, propertyId, ejarContractNo, tenantName;
  final String? tenantEmail, propertyName, unitLabel, tenantUid, status;
  final String startDate, endDate;
  final double annualRent, depositAmount;
  final PaymentCycle cycle;

  factory Lease.fromMap(Map<String, Object?> m) => Lease(
    unitId: _s(m, 'unitId'),
    propertyId: _s(m, 'propertyId'),
    ejarContractNo: _s(m, 'ejarContractNo'),
    tenantName: _s(m, 'tenantName'),
    tenantEmail: m['tenantEmail'] as String?,
    propertyName: m['propertyName'] as String?,
    unitLabel: m['unitLabel'] as String?,
    startDate: _s(m, 'startDate'),
    endDate: _s(m, 'endDate'),
    annualRent: _n(m, 'annualRent'),
    cycle: PaymentCycle.values.firstWhere(
      (c) => c.name == m['cycle'],
      orElse: () => PaymentCycle.monthly,
    ),
    depositAmount: _n(m, 'depositAmount'),
    tenantUid: m['tenantUid'] as String?,
    status: m['status'] as String?,
  );

  /// Written once at creation. `tenantUid` is set later, server-side, when the tenant is linked.
  Map<String, Object?> toMap() => {
    'unitId': unitId,
    'propertyId': propertyId,
    'ejarContractNo': ejarContractNo,
    'tenantName': tenantName,
    if (tenantEmail != null) 'tenantEmail': tenantEmail,
    if (propertyName != null) 'propertyName': propertyName,
    if (unitLabel != null) 'unitLabel': unitLabel,
    'startDate': startDate,
    'endDate': endDate,
    'annualRent': annualRent,
    'cycle': cycle.name,
    'depositAmount': depositAmount,
  };
}

class Payment {
  const Payment({
    required this.leaseId,
    required this.unitId,
    required this.dueDate,
    required this.amount,
    required this.paid,
    this.paidAt,
    this.receiptPath,
    this.tenantUid,
  });
  final String leaseId, unitId, dueDate;
  final double amount;
  final bool paid;
  final String? paidAt, receiptPath, tenantUid;

  factory Payment.fromMap(Map<String, Object?> m) => Payment(
    leaseId: _s(m, 'leaseId'),
    unitId: _s(m, 'unitId'),
    dueDate: _s(m, 'dueDate'),
    amount: _n(m, 'amount'),
    paid: m['status'] == 'paid',
    paidAt: m['paidAt'] as String?,
    receiptPath: m['receiptPath'] as String?,
    tenantUid: m['tenantUid'] as String?,
  );
}

class Expense {
  const Expense({
    required this.propertyId,
    required this.category,
    required this.amount,
    required this.date,
    this.note = '',
  });
  final String propertyId, category, date, note;
  final double amount;

  factory Expense.fromMap(Map<String, Object?> m) => Expense(
    propertyId: _s(m, 'propertyId'),
    category: _s(m, 'category', 'other'),
    amount: _n(m, 'amount'),
    date: _s(m, 'date'),
    note: _s(m, 'note'),
  );

  Map<String, Object?> toMap() => {
    'propertyId': propertyId,
    'category': category,
    'amount': amount,
    'date': date,
    'note': note,
  };
}

const expenseCategories = [
  'maintenance',
  'utilities',
  'insurance',
  'fees',
  'other',
];
const unitTypes = ['studio', 'apartment', 'villa'];

/// Everything one session can see, already scoped by role (staff: whole org; tenant: own lease only).
class OpsData {
  const OpsData({
    this.properties = const [],
    this.units = const [],
    this.leases = const [],
    this.payments = const [],
    this.expenses = const [],
  });
  final List<Doc<Property>> properties;
  final List<Doc<RentalUnit>> units;
  final List<Doc<Lease>> leases;
  final List<Doc<Payment>> payments;
  final List<Doc<Expense>> expenses;

  List<Doc<Payment>> paymentsOf(String leaseId) =>
      payments.where((p) => p.data.leaseId == leaseId).toList()
        ..sort((a, b) => a.data.dueDate.compareTo(b.data.dueDate));

  List<Reminder> reminders(String today) => computeReminders(
    today,
    [for (final l in leases) LeaseRef(l.id, l.data.endDate, l.data.status)],
    [
      for (final p in payments)
        PaymentRef(p.id, p.data.leaseId, p.data.dueDate, p.data.paid),
    ],
  );
}
