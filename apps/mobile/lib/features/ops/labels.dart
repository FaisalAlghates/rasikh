import 'package:intl/intl.dart';

import '../../domain/domain.dart';
import '../../l10n/app_localizations.dart';

final _money = NumberFormat('#,##0.##', 'en');

/// Amounts use Western digits with thousands separators, as in the web app.
String money(num n) => _money.format(n);

String cycleLabel(AppLocalizations l, PaymentCycle c) => switch (c) {
  PaymentCycle.monthly => l.opsMonthly,
  PaymentCycle.quarterly => l.opsQuarterly,
  PaymentCycle.semiannual => l.opsSemiannual,
  PaymentCycle.annual => l.opsAnnual,
};

String unitTypeLabel(AppLocalizations l, String t) => switch (t) {
  'studio' => l.opsTypeStudio,
  'villa' => l.opsTypeVilla,
  _ => l.opsTypeApartment,
};

String categoryLabel(AppLocalizations l, String c) => switch (c) {
  'maintenance' => l.opsCatMaintenance,
  'utilities' => l.opsCatUtilities,
  'insurance' => l.opsCatInsurance,
  'fees' => l.opsCatFees,
  _ => l.opsCatOther,
};

String kindLabel(AppLocalizations l, String k) =>
    k == 'villa' ? l.opsKindVilla : l.opsKindBuilding;

String reminderLabel(AppLocalizations l, ReminderKind k) => switch (k) {
  ReminderKind.paymentUpcoming => l.opsNUpcoming,
  ReminderKind.paymentLate => l.opsNLate,
  ReminderKind.leaseExpiring => l.opsNExpiring,
  ReminderKind.renewalNotice => l.opsNRenewal,
};
