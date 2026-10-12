import '../domain/domain.dart';
import 'ops_models.dart';

/// Mirrors `LeaseSchema` / `ExpenseSchema` in packages/shared; the form maps each failure to a translated message.
enum LeaseIssue {
  ejarNo,
  tenantName,
  tenantEmail,
  startDate,
  endDate,
  endBeforeStart,
  rent,
  deposit,
}

final _isoDate = RegExp(r'^\d{4}-\d{2}-\d{2}$');
final _ejarNo = RegExp(r'^[0-9A-Za-z-]{6,30}$');
final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

/// True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-31).
bool isIsoDate(String s) {
  if (!_isoDate.hasMatch(s)) return false;
  final p = s.split('-').map(int.parse).toList();
  final d = DateTime.utc(p[0], p[1], p[2]);
  return d.year == p[0] && d.month == p[1] && d.day == p[2];
}

/// Parses user-typed numbers, accepting Arabic-Indic digits and the Arabic decimal separator.
double? parseAmount(String raw) {
  const ar = '٠١٢٣٤٥٦٧٨٩';
  var s = raw
      .trim()
      .replaceAll(',', '')
      .replaceAll('٬', '')
      .replaceAll('٫', '.');
  for (var i = 0; i < ar.length; i++) {
    s = s.replaceAll(ar[i], '$i');
  }
  return double.tryParse(s);
}

/// Normalises typed digits (Arabic-Indic → ASCII) for date and contract-number fields.
String asciiDigits(String raw) {
  const ar = '٠١٢٣٤٥٦٧٨٩';
  var s = raw.trim();
  for (var i = 0; i < ar.length; i++) {
    s = s.replaceAll(ar[i], '$i');
  }
  return s;
}

class LeaseDraft {
  const LeaseDraft({
    required this.ejarNo,
    required this.tenantName,
    required this.tenantEmail,
    required this.startDate,
    required this.endDate,
    required this.annualRent,
    required this.depositAmount,
    required this.cycle,
  });
  final String ejarNo, tenantName, tenantEmail, startDate, endDate;
  final String annualRent, depositAmount;
  final PaymentCycle cycle;

  Map<LeaseIssue, bool> validate() {
    final issues = <LeaseIssue, bool>{};
    if (!_ejarNo.hasMatch(asciiDigits(ejarNo))) {
      issues[LeaseIssue.ejarNo] = true;
    }
    if (tenantName.trim().length < 2) issues[LeaseIssue.tenantName] = true;
    if (tenantEmail.trim().isNotEmpty && !_email.hasMatch(tenantEmail.trim())) {
      issues[LeaseIssue.tenantEmail] = true;
    }
    final s = asciiDigits(startDate);
    final e = asciiDigits(endDate);
    if (!isIsoDate(s)) issues[LeaseIssue.startDate] = true;
    if (!isIsoDate(e)) issues[LeaseIssue.endDate] = true;
    if (isIsoDate(s) && isIsoDate(e) && e.compareTo(s) <= 0) {
      issues[LeaseIssue.endBeforeStart] = true;
    }
    final rent = parseAmount(annualRent);
    if (rent == null || rent <= 0 || rent > 100000000) {
      issues[LeaseIssue.rent] = true;
    }
    if (depositAmount.trim().isNotEmpty) {
      final d = parseAmount(depositAmount);
      if (d == null || d < 0) issues[LeaseIssue.deposit] = true;
    }
    return issues;
  }

  Lease toLease({
    required String unitId,
    required String propertyId,
    required String propertyName,
    required String unitLabel,
  }) => Lease(
    unitId: unitId,
    propertyId: propertyId,
    ejarContractNo: asciiDigits(ejarNo),
    tenantName: tenantName.trim(),
    tenantEmail: tenantEmail.trim().isEmpty
        ? null
        : tenantEmail.trim().toLowerCase(),
    propertyName: propertyName,
    unitLabel: unitLabel,
    startDate: asciiDigits(startDate),
    endDate: asciiDigits(endDate),
    annualRent: parseAmount(annualRent)!,
    cycle: cycle,
    depositAmount: depositAmount.trim().isEmpty
        ? 0
        : parseAmount(depositAmount)!,
  );
}
