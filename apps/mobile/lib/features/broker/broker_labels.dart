import '../../l10n/app_localizations.dart';

/// Translated labels for the broker enums. Unknown values fall back to the raw code rather than crash.
String interestLabel(AppLocalizations l, String v) => switch (v) {
  'rent' => l.brkInterestRent,
  'buy' => l.brkInterestBuy,
  'let_my_property' => l.brkInterestLetMyProperty,
  'sell_my_property' => l.brkInterestSellMyProperty,
  _ => v,
};

String sourceLabel(AppLocalizations l, String v) => switch (v) {
  'referral' => l.brkSourceReferral,
  'walk_in' => l.brkSourceWalkIn,
  'call' => l.brkSourceCall,
  'social' => l.brkSourceSocial,
  'other' => l.brkSourceOther,
  _ => v,
};

String statusLabel(AppLocalizations l, String v) => switch (v) {
  'new' => l.brkStatusNew,
  'contacted' => l.brkStatusContacted,
  'viewing' => l.brkStatusViewing,
  'negotiating' => l.brkStatusNegotiating,
  'won' => l.brkStatusWon,
  'lost' => l.brkStatusLost,
  _ => v,
};

String contractTypeLabel(AppLocalizations l, String v) => switch (v) {
  'rent' => l.brkTypeRent,
  'sale' => l.brkTypeSale,
  'management' => l.brkTypeManagement,
  _ => v,
};

String logTypeLabel(AppLocalizations l, String v) => switch (v) {
  'lead_created' => l.brkLogLeadCreated,
  'status_changed' => l.brkLogStatusChanged,
  'viewing_scheduled' => l.brkLogViewingScheduled,
  'viewing_done' => l.brkLogViewingDone,
  'contract_added' => l.brkLogContractAdded,
  'note' => l.brkLogNote,
  _ => v,
};

String purposeLabel(AppLocalizations l, String v) =>
    v == 'sale' ? l.brkAdPurposeSale : l.brkAdPurposeRent;

String capacityLabel(AppLocalizations l, String v) => switch (v) {
  'owner' => l.brkAdCapacityOwner,
  'broker' => l.brkAdCapacityBroker,
  'agent' => l.brkAdCapacityAgent,
  'developer' => l.brkAdCapacityDeveloper,
  _ => v,
};

String issueLabel(AppLocalizations l, String code) => switch (code) {
  'purpose_missing' => l.brkIssuePurposeMissing,
  'advertiser_missing' => l.brkIssueAdvertiserMissing,
  'capacity_missing' => l.brkIssueCapacityMissing,
  'license_missing' => l.brkIssueLicenseMissing,
  'license_invalid' => l.brkIssueLicenseInvalid,
  'license_expired' => l.brkIssueLicenseExpired,
  'license_expiring' => l.brkIssueLicenseExpiring,
  'location_missing' => l.brkIssueLocationMissing,
  'property_type_missing' => l.brkIssuePropertyTypeMissing,
  'area_missing' => l.brkIssueAreaMissing,
  'price_missing' => l.brkIssuePriceMissing,
  'contact_missing' => l.brkIssueContactMissing,
  'contact_invalid' => l.brkIssueContactInvalid,
  'description_short' => l.brkIssueDescriptionShort,
  'encumbrances_not_stated' => l.brkIssueEncumbrancesNotStated,
  _ => code,
};
