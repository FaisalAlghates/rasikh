// Dart port of packages/shared/src/broker.ts. Keep the two in sync: test/broker_test.dart uses the same
// fixtures as packages/shared/src/broker.test.ts.

import 'domain.dart';

final _fal = RegExp(r'^\d{8,12}$');
final _saudiPhone = RegExp(r'^\+9665\d{8}$');

bool isFalLicense(String s) => _fal.hasMatch(s);
bool isSaudiPhone(String s) => _saudiPhone.hasMatch(s);

// ---- FAL license -------------------------------------------------------------------------------

enum FalState { valid, expiring, expired }

FalState falState(String expiry, String today) {
  final left = daysBetween(today, expiry);
  if (left < 0) return FalState.expired;
  return left <= 30 ? FalState.expiring : FalState.valid;
}

/// The tightest reminder window the license has entered (60, 30 or 7 days), or null.
int? falReminder(String expiry, String today) {
  final left = daysBetween(today, expiry);
  if (left < 0) return null;
  for (final d in const [7, 30, 60]) {
    if (left <= d) return d;
  }
  return null;
}

// ---- Lead funnel -------------------------------------------------------------------------------

const leadStatuses = [
  'new',
  'contacted',
  'viewing',
  'negotiating',
  'won',
  'lost',
];
const leadInterests = ['rent', 'buy', 'let_my_property', 'sell_my_property'];
const leadSources = ['referral', 'walk_in', 'call', 'social', 'other'];
const brokerageTypes = ['rent', 'sale', 'management'];

/// Forward only, or to lost; a lead never leaves won or lost.
bool canMoveLead(String from, String to) {
  if (from == to) return false;
  if (from == 'won' || from == 'lost') return false;
  if (to == 'lost') return true;
  return leadStatuses.indexOf(to) > leadStatuses.indexOf(from);
}

// ---- Ad compliance checker ---------------------------------------------------------------------

const adPurposes = ['sale', 'rent'];
const adCapacities = ['owner', 'broker', 'agent', 'developer'];
const minAdDescription = 30;
const adLicenseWarnDays = 30;

class AdDraft {
  const AdDraft({
    this.purpose,
    this.advertiserName,
    this.capacity,
    this.adLicenseNo,
    this.adLicenseExpiry,
    this.city,
    this.district,
    this.propertyType,
    this.areaSqm,
    this.priceSar,
    this.phone,
    this.description,
    this.disclosesEncumbrances,
  });
  final String? purpose,
      advertiserName,
      capacity,
      adLicenseNo,
      adLicenseExpiry,
      city,
      district,
      propertyType,
      phone,
      description;
  final double? areaSqm, priceSar;

  /// `null` = not stated.
  final bool? disclosesEncumbrances;
}

class AdIssue {
  const AdIssue(this.code, this.error);
  final String code;
  final bool error;

  @override
  bool operator ==(Object other) =>
      other is AdIssue && other.code == code && other.error == error;
  @override
  int get hashCode => Object.hash(code, error);
}

bool _blank(String? s) => s == null || s.trim().isEmpty;

List<AdIssue> checkAd(AdDraft ad, String today) {
  final out = <AdIssue>[];
  void err(String c) => out.add(AdIssue(c, true));
  void warn(String c) => out.add(AdIssue(c, false));

  if (ad.purpose == null) err('purpose_missing');
  if (_blank(ad.advertiserName)) err('advertiser_missing');
  if (ad.capacity == null) err('capacity_missing');

  if (_blank(ad.adLicenseNo)) {
    err('license_missing');
  } else if (!isFalLicense(ad.adLicenseNo!)) {
    err('license_invalid');
  }
  if (!_blank(ad.adLicenseNo) && !_blank(ad.adLicenseExpiry)) {
    final left = daysBetween(today, ad.adLicenseExpiry!);
    if (left < 0) {
      err('license_expired');
    } else if (left <= adLicenseWarnDays) {
      warn('license_expiring');
    }
  }

  if (_blank(ad.city) || _blank(ad.district)) err('location_missing');
  if (_blank(ad.propertyType)) err('property_type_missing');
  if (ad.areaSqm == null || ad.areaSqm! <= 0) err('area_missing');
  if (ad.priceSar == null || ad.priceSar! <= 0) err('price_missing');

  if (_blank(ad.phone)) {
    err('contact_missing');
  } else if (!isSaudiPhone(ad.phone!)) {
    err('contact_invalid');
  }

  if (_blank(ad.description) ||
      ad.description!.trim().length < minAdDescription) {
    err('description_short');
  }
  if (ad.disclosesEncumbrances == null) warn('encumbrances_not_stated');
  return out;
}

/// Ready only when nothing is an error; warnings stay visible.
bool adIsReady(List<AdIssue> issues) => !issues.any((i) => i.error);
