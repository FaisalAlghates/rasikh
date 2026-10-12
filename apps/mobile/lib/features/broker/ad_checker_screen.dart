import 'package:flutter/material.dart';

import '../../domain/broker.dart';
import '../../domain/domain.dart' show riyadhToday;
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/tab_page.dart';
import 'broker_labels.dart';

/// A live checklist for an ad draft. Nothing is stored or published; "ready" only means the data is complete.
class AdCheckerScreen extends StatefulWidget {
  const AdCheckerScreen({super.key});
  @override
  State<AdCheckerScreen> createState() => _AdCheckerScreenState();
}

class _AdCheckerScreenState extends State<AdCheckerScreen> {
  final _c = {
    for (final k in [
      'adv',
      'lic',
      'exp',
      'city',
      'district',
      'type',
      'area',
      'price',
      'phone',
      'desc',
    ])
      k: TextEditingController(),
  };
  String? _purpose, _capacity;
  bool? _enc;

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _t(String k) => _c[k]!.text;

  List<AdIssue> _issues() => checkAd(
    AdDraft(
      purpose: _purpose,
      capacity: _capacity,
      advertiserName: _t('adv'),
      adLicenseNo: _t('lic'),
      adLicenseExpiry: _t('exp'),
      city: _t('city'),
      district: _t('district'),
      propertyType: _t('type'),
      areaSqm: double.tryParse(_t('area')),
      priceSar: double.tryParse(_t('price')),
      phone: _t('phone'),
      description: _t('desc'),
      disclosesEncumbrances: _enc,
    ),
    riyadhToday(),
  );

  Widget _f(String key, String label, {bool ltr = false, TextInputType? kt}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: RkField(
          key: Key('ad-$key'),
          label: label,
          controller: _c[key],
          ltr: ltr,
          keyboardType: kt,
          onChanged: (_) => setState(() {}),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final issues = _issues();
    final ready = adIsReady(issues);
    return SubPage(
      title: l10n.brkAdTitle,
      children: [
        Text(
          l10n.brkAdIntro,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
        const SizedBox(height: 16),
        RkSelect<String>(
          label: l10n.brkAdPurpose,
          value: _purpose,
          options: [
            for (final v in adPurposes)
              RkSelectOption(v, purposeLabel(l10n, v)),
          ],
          onChanged: (v) => setState(() => _purpose = v),
        ),
        const SizedBox(height: 12),
        _f('adv', l10n.brkAdAdvertiser),
        RkSelect<String>(
          label: l10n.brkAdCapacity,
          value: _capacity,
          options: [
            for (final v in adCapacities)
              RkSelectOption(v, capacityLabel(l10n, v)),
          ],
          onChanged: (v) => setState(() => _capacity = v),
        ),
        const SizedBox(height: 12),
        _f('lic', l10n.brkAdLicenseNo, ltr: true, kt: TextInputType.number),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: RkDateField(
            key: const Key('ad-exp'),
            label: l10n.brkAdLicenseExpiry,
            controller: _c['exp']!,
            pickerLabel: l10n.brkAdLicenseExpiry,
            onChanged: (_) => setState(() {}),
          ),
        ),
        _f('city', l10n.brkAdCity),
        _f('district', l10n.brkAdDistrict),
        _f('type', l10n.brkAdType),
        _f('area', l10n.brkAdArea, kt: TextInputType.number),
        _f('price', l10n.brkAdPrice, kt: TextInputType.number),
        _f('phone', l10n.brkAdPhone, ltr: true, kt: TextInputType.phone),
        RkSelect<bool?>(
          label: l10n.brkAdEncumbrances,
          value: _enc,
          placeholder: l10n.brkAdEncUnset,
          options: [
            RkSelectOption(false, l10n.brkAdEncNo),
            RkSelectOption(true, l10n.brkAdEncYes),
          ],
          onChanged: (v) => setState(() => _enc = v),
        ),
        const SizedBox(height: 12),
        _f('desc', l10n.brkAdDescription),
        Semantics(
          liveRegion: true,
          child: Text(
            ready ? l10n.brkAdReady : l10n.brkAdNotReady,
            key: const Key('adVerdict'),
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: ready ? t.success : t.danger,
            ),
          ),
        ),
        const SizedBox(height: 8),
        for (final i in issues)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              key: Key('adIssue-${i.code}'),
              '${i.error ? l10n.brkAdError : l10n.brkAdWarning} · ${issueLabel(l10n, i.code)}',
              style: TextStyle(
                fontSize: 13,
                color: i.error ? t.danger : t.warning,
              ),
            ),
          ),
      ],
    );
  }
}
