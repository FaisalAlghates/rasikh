import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/domain/broker.dart';

// Same fixtures as packages/shared/src/broker.test.ts.
const today = '2026-10-12';

const goodAd = AdDraft(
  purpose: 'rent',
  advertiserName: 'مكتب الأفق العقاري',
  capacity: 'broker',
  adLicenseNo: '1234567890',
  adLicenseExpiry: '2027-10-12',
  city: 'الرياض',
  district: 'حي النرجس',
  propertyType: 'شقة',
  areaSqm: 140,
  priceSar: 48000,
  phone: '+966512345678',
  description: 'شقة من ثلاث غرف في الدور الثاني، قريبة من الخدمات والمدارس.',
  disclosesEncumbrances: false,
);

AdDraft copy(
  AdDraft a, {
  String? adLicenseNo,
  String? adLicenseExpiry,
  String? district,
  String? phone,
  String? description,
  double? areaSqm,
  double? priceSar,
  bool? enc = false,
}) => AdDraft(
  purpose: a.purpose,
  advertiserName: a.advertiserName,
  capacity: a.capacity,
  adLicenseNo: adLicenseNo ?? a.adLicenseNo,
  adLicenseExpiry: adLicenseExpiry ?? a.adLicenseExpiry,
  city: a.city,
  district: district ?? a.district,
  propertyType: a.propertyType,
  areaSqm: areaSqm ?? a.areaSqm,
  priceSar: priceSar ?? a.priceSar,
  phone: phone ?? a.phone,
  description: description ?? a.description,
  disclosesEncumbrances: enc,
);

List<String> codes(AdDraft a) => [for (final i in checkAd(a, today)) i.code];

void main() {
  group('FAL license', () {
    test('valid far away, expiring inside 30 days, expired after', () {
      expect(falState('2027-01-01', today), FalState.valid);
      expect(falState('2026-11-11', today), FalState.expiring);
      expect(falState('2026-10-12', today), FalState.expiring);
      expect(falState('2026-10-11', today), FalState.expired);
    });

    test('reports the tightest reminder window', () {
      expect(falReminder('2026-12-11', today), 60);
      expect(falReminder('2026-11-11', today), 30);
      expect(falReminder('2026-10-19', today), 7);
      expect(falReminder('2027-06-01', today), isNull);
      expect(falReminder('2026-10-01', today), isNull);
    });
  });

  group('lead funnel', () {
    test('only forward, or to lost', () {
      expect(canMoveLead('new', 'contacted'), isTrue);
      expect(canMoveLead('new', 'negotiating'), isTrue);
      expect(canMoveLead('viewing', 'new'), isFalse);
      expect(canMoveLead('viewing', 'lost'), isTrue);
      expect(canMoveLead('new', 'new'), isFalse);
    });

    test('never leaves won or lost', () {
      expect(canMoveLead('won', 'lost'), isFalse);
      expect(canMoveLead('lost', 'contacted'), isFalse);
    });
  });

  group('ad compliance checker', () {
    test('a complete ad has no issues', () {
      expect(checkAd(goodAd, today), isEmpty);
      expect(adIsReady(checkAd(goodAd, today)), isTrue);
    });

    test('an empty draft lists every mandatory field', () {
      expect(codes(const AdDraft()), [
        'purpose_missing',
        'advertiser_missing',
        'capacity_missing',
        'license_missing',
        'location_missing',
        'property_type_missing',
        'area_missing',
        'price_missing',
        'contact_missing',
        'description_short',
        'encumbrances_not_stated',
      ]);
      expect(adIsReady(checkAd(const AdDraft(), today)), isFalse);
    });

    test('rejects a malformed license and an invalid phone', () {
      expect(
        codes(copy(goodAd, adLicenseNo: 'AB12')),
        contains('license_invalid'),
      );
      expect(
        codes(copy(goodAd, phone: '0512345678')),
        contains('contact_invalid'),
      );
    });

    test(
      'expired license is an error, near expiry a warning that does not block',
      () {
        final expired = checkAd(
          copy(goodAd, adLicenseExpiry: '2026-10-11'),
          today,
        );
        expect(expired, contains(const AdIssue('license_expired', true)));
        expect(adIsReady(expired), isFalse);

        final near = checkAd(
          copy(goodAd, adLicenseExpiry: '2026-11-01'),
          today,
        );
        expect(near, [const AdIssue('license_expiring', false)]);
        expect(adIsReady(near), isTrue);
      },
    );

    test('needs location, real area and price', () {
      expect(codes(copy(goodAd, district: ' ')), contains('location_missing'));
      expect(codes(copy(goodAd, areaSqm: 0)), contains('area_missing'));
      expect(codes(copy(goodAd, priceSar: -5)), contains('price_missing'));
    });

    test('wants a real description and a statement about encumbrances', () {
      expect(
        codes(copy(goodAd, description: 'شقة جميلة')),
        contains('description_short'),
      );
      expect(checkAd(copy(goodAd, enc: null), today), [
        const AdIssue('encumbrances_not_stated', false),
      ]);
      expect(codes(copy(goodAd, enc: true)), isEmpty);
    });
  });
}
