import '../../domain/maintenance.dart';
import '../../l10n/app_localizations.dart';

String categoryLabel(AppLocalizations l, String c) => switch (c) {
  'consumables' => l.mtCatConsumables,
  'tenant_damage' => l.mtCatTenantDamage,
  'plumbing' => l.mtCatPlumbing,
  'electrical' => l.mtCatElectrical,
  'ac' => l.mtCatAc,
  'appliance' => l.mtCatAppliance,
  'structure' => l.mtCatStructure,
  'pest' => l.mtCatPest,
  _ => l.mtCatOther,
};

String urgencyLabel(AppLocalizations l, String u) => switch (u) {
  'low' => l.mtUrgLow,
  'urgent' => l.mtUrgUrgent,
  'emergency' => l.mtUrgEmergency,
  _ => l.mtUrgNormal,
};

String statusLabel(AppLocalizations l, String s) => switch (s) {
  'assigned' => l.mtStAssigned,
  'in_progress' => l.mtStInProgress,
  'resolved' => l.mtStResolved,
  'closed' => l.mtStClosed,
  'cancelled' => l.mtStCancelled,
  _ => l.mtStOpen,
};

String slaLabel(AppLocalizations l, SlaState s) => switch (s) {
  SlaState.met => l.mtSlaMet,
  SlaState.ok => l.mtSlaOk,
  SlaState.dueSoon => l.mtSlaDueSoon,
  SlaState.breached => l.mtSlaBreached,
};
