import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../data/auth_repository.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/page_scaffold.dart';

/// Roles a user may pick for themselves. `admin` is never self-assigned (server enforces it too).
const selfServiceRoles = ['owner', 'tenant', 'manager', 'broker', 'vendor'];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _roles = <String>{};
  final _name = TextEditingController();
  final _org = TextEditingController();
  bool _consent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _org.dispose();
    super.dispose();
  }

  (String, String) _roleText(AppLocalizations l, String role) => switch (role) {
    'owner' => (l.roleOwner, l.roleOwnerHint),
    'tenant' => (l.roleTenant, l.roleTenantHint),
    'manager' => (l.roleManager, l.roleManagerHint),
    'broker' => (l.roleBroker, l.roleBrokerHint),
    _ => (l.roleVendor, l.roleVendorHint),
  };

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    if (_roles.isEmpty) return setState(() => _error = l10n.errPickRole);
    if (!_consent) return setState(() => _error = l10n.errNeedConsent);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .createOrganization(
            name: _org.text.trim(),
            displayName: _name.text.trim(),
            roles: _roles.toList(),
            locale: locale,
          );
      // The router redirects to the workspace when the refreshed claims arrive.
    } on OrgException catch (e) {
      if (mounted) {
        setState(
          () => _error = e.failure == OrgFailure.tooManyOrgs
              ? l10n.errTooManyOrgs
              : l10n.errOrgGeneric,
        );
      }
    } catch (_) {
      if (mounted) setState(() => _error = l10n.errOrgGeneric);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final ready = _name.text.trim().length >= 2 && _org.text.trim().length >= 2;

    return PageScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.onboardingTitle, style: displayStyle(context, 28)),
          const SizedBox(height: 8),
          Text(l10n.onboardingSubtitle, style: TextStyle(color: t.textMuted)),
          const SizedBox(height: 24),
          for (final role in selfServiceRoles)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RoleTile(
                key: Key('role-$role'),
                title: _roleText(l10n, role).$1,
                hint: _roleText(l10n, role).$2,
                selected: _roles.contains(role),
                onChanged: (on) =>
                    setState(() => on ? _roles.add(role) : _roles.remove(role)),
              ),
            ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('displayName'),
            controller: _name,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l10n.displayName),
          ),
          const SizedBox(height: 16),
          TextField(
            key: const Key('orgName'),
            controller: _org,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l10n.orgName),
          ),
          const SizedBox(height: 16),
          CheckboxListTile(
            key: const Key('consent'),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _consent,
            onChanged: (v) => setState(() => _consent = v ?? false),
            title: Text(
              l10n.consent,
              style: TextStyle(color: t.textMuted, fontSize: 15),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Semantics(
              liveRegion: true,
              child: Text(
                _error!,
                style: TextStyle(color: t.danger, fontSize: 15),
              ),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            key: const Key('submitOrg'),
            onPressed: (_busy || !ready) ? null : _submit,
            child: Text(l10n.submitOrg),
          ),
        ],
      ),
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({
    super.key,
    required this.title,
    required this.hint,
    required this.selected,
    required this.onChanged,
  });
  final String title;
  final String hint;
  final bool selected;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      checked: selected,
      label: '$title، $hint',
      excludeSemantics: true,
      onTap: () => onChanged(!selected),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => onChanged(!selected),
        child: Container(
          constraints: const BoxConstraints(minHeight: 56),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: selected ? t.surface : null,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? t.brand : t.border.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected ? Icons.check_box : Icons.check_box_outline_blank,
                color: selected ? t.brandText : t.textMuted,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      hint,
                      style: TextStyle(fontSize: 13, color: t.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
