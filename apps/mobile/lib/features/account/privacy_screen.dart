import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/account_providers.dart';
import '../../app/providers.dart';
import '../../data/account_repository.dart';
import '../../data/auth_repository.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';

/// PDPL rights: download everything held about me, and delete my account after a fresh password sign-in.
class PrivacyScreen extends ConsumerStatefulWidget {
  const PrivacyScreen({super.key});
  @override
  ConsumerState<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends ConsumerState<PrivacyScreen> {
  final _password = TextEditingController();
  bool _sure = false;
  bool _exporting = false;
  bool _deleting = false;
  String? _message;
  bool _ok = false;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _export() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _exporting = true;
      _message = null;
    });
    try {
      final json = await ref.read(accountRepositoryProvider).exportMyData();
      await ref
          .read(dataFileSharerProvider)
          .share(fileName: 'rasikh-my-data.json', json: json);
      if (mounted) {
        setState(() {
          _ok = true;
          _message = l10n.accExported;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _ok = false;
          _message = l10n.accFailed;
        });
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _delete() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _deleting = true;
      _message = null;
    });
    try {
      await ref.read(authRepositoryProvider).reauthWithPassword(_password.text);
    } on AuthException {
      if (mounted) {
        setState(() {
          _deleting = false;
          _ok = false;
          _message = l10n.accWrongPassword;
        });
      }
      return;
    }
    try {
      await ref.read(accountRepositoryProvider).deleteMyAccount();
      await ref.read(authRepositoryProvider).signOut();
    } on AccountException catch (e) {
      if (mounted) {
        setState(() {
          _deleting = false;
          _ok = false;
          _message = e.failure == AccountFailure.transferOwnershipFirst
              ? l10n.accTransfer
              : l10n.accFailed;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _deleting = false;
          _ok = false;
          _message = l10n.accFailed;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final session = ref.watch(sessionProvider).value;
    final hasPassword = session?.hasPassword ?? false;
    return SubPage(
      title: l10n.accTab,
      children: [
        Text(l10n.accIntro, style: TextStyle(fontSize: 13, color: t.textMuted)),
        const SizedBox(height: 16),
        RkButton(
          key: const Key('exportData'),
          label: _exporting ? l10n.accExporting : l10n.accExport,
          variant: RkButtonVariant.quiet,
          loading: _exporting,
          onPressed: _export,
        ),
        const SizedBox(height: 16),
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.accDeleteTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: t.danger,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.accDeleteWarn,
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
              const SizedBox(height: 12),
              if (hasPassword) ...[
                RkField(
                  key: const Key('deletePassword'),
                  label: l10n.accPassword,
                  controller: _password,
                  obscureText: true,
                  ltr: true,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Checkbox(
                      key: const Key('deleteSure'),
                      value: _sure,
                      onChanged: (v) => setState(() => _sure = v ?? false),
                    ),
                    Expanded(child: Text(l10n.accConfirm)),
                  ],
                ),
                const SizedBox(height: 8),
                RkButton(
                  key: const Key('deleteAccount'),
                  label: l10n.accDelete,
                  loading: _deleting,
                  onPressed: _sure && _password.text.isNotEmpty
                      ? _delete
                      : null,
                ),
              ] else
                Text(l10n.accPhoneNote, key: const Key('phoneNote')),
            ],
          ),
        ),
        if (_message != null) ...[
          const SizedBox(height: 12),
          Semantics(
            liveRegion: true,
            child: Text(
              _message!,
              key: const Key('privacyMessage'),
              style: TextStyle(color: _ok ? t.success : t.danger),
            ),
          ),
        ],
      ],
    );
  }
}
