import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/inspection_providers.dart';
import '../../app/providers.dart';
import '../../data/auth_repository.dart';
import '../../data/inspection_repository.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import 'inspect_labels.dart';

/// Signing needs a fresh proof of identity: the account password, or a new SMS code for phone accounts.
/// The server also checks that the sign-in is recent, so this step cannot be skipped.
Future<SignResult?> showSignSheet(
  BuildContext context, {
  required String orgId,
  required String inspectionId,
  required bool asOwner,
}) {
  final l10n = AppLocalizations.of(context);
  return showRkSheet<SignResult>(
    context,
    title: asOwner ? l10n.inspSignAsOwner : l10n.inspSignAsTenant,
    child: _SignForm(orgId: orgId, inspectionId: inspectionId),
  );
}

class _SignForm extends ConsumerStatefulWidget {
  const _SignForm({required this.orgId, required this.inspectionId});
  final String orgId, inspectionId;

  @override
  ConsumerState<_SignForm> createState() => _SignFormState();
}

class _SignFormState extends ConsumerState<_SignForm> {
  final _secret = TextEditingController();
  bool _codeSent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _secret.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() fn) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await fn();
    } on SignFailure catch (e) {
      if (mounted) setState(() => _error = signErrorLabel(l10n, e.code));
    } on AuthException {
      if (mounted) setState(() => _error = l10n.inspErrAuth);
    } catch (_) {
      if (mounted) setState(() => _error = l10n.inspErrGeneric);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sign() async {
    final result = await ref
        .read(inspectionRepositoryProvider)
        .sign(widget.orgId, widget.inspectionId);
    if (mounted) Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final session = ref.watch(sessionProvider).value;
    final auth = ref.read(authRepositoryProvider);
    final usesPassword = session?.hasPassword ?? false;
    final usesPhone = !usesPassword && (session?.hasPhone ?? false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.inspSignExplain,
          style: TextStyle(fontSize: 15, height: 1.6, color: t.textMuted),
        ),
        const SizedBox(height: 16),
        if (usesPassword) ...[
          RkField(
            key: const Key('signPassword'),
            label: l10n.inspConfirmPassword,
            controller: _secret,
            obscureText: true,
            ltr: true,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          RkButton(
            key: const Key('signConfirm'),
            label: l10n.inspConfirmAndSign,
            loading: _busy,
            onPressed: _secret.text.length < 6
                ? null
                : () => _run(() async {
                    await auth.reauthWithPassword(_secret.text);
                    await _sign();
                  }),
          ),
        ] else if (usesPhone) ...[
          if (_codeSent) ...[
            RkField(
              key: const Key('signCode'),
              label: l10n.inspSmsCode,
              controller: _secret,
              keyboardType: TextInputType.number,
              ltr: true,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            RkButton(
              key: const Key('signConfirm'),
              label: l10n.inspConfirmAndSign,
              loading: _busy,
              onPressed: _secret.text.length < 6
                  ? null
                  : () => _run(() async {
                      await auth.confirmReauthPhone(_secret.text);
                      await _sign();
                    }),
            ),
          ] else
            RkButton(
              key: const Key('signSendCode'),
              label: l10n.inspSendCode,
              loading: _busy,
              onPressed: () => _run(() async {
                await auth.startReauthPhone();
                if (mounted) setState(() => _codeSent = true);
              }),
            ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 12),
          Semantics(
            liveRegion: true,
            child: Text(
              _error!,
              key: const Key('signError'),
              style: TextStyle(color: t.danger, fontSize: 15),
            ),
          ),
        ],
        const SizedBox(height: 12),
        Text(
          l10n.inspSignLegal,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
      ],
    );
  }
}
