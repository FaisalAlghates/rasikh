import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../data/auth_repository.dart';
import '../../data/validators.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/page_scaffold.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _phoneTab = true;
  bool _creating = false;
  bool _codeSent = false;
  bool _busy = false;
  String? _error;

  final _phone = TextEditingController();
  final _code = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    for (final c in [_phone, _code, _email, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  String _message(AppLocalizations l10n, AuthFailure f) => switch (f) {
    AuthFailure.invalidPhone => l10n.errInvalidPhone,
    AuthFailure.invalidCode => l10n.errInvalidCode,
    AuthFailure.invalidCredentials => l10n.errInvalidCredentials,
    AuthFailure.emailInUse => l10n.errEmailInUse,
    AuthFailure.weakPassword => l10n.errWeakPassword,
    AuthFailure.tooManyRequests => l10n.errTooMany,
    AuthFailure.generic => l10n.errGeneric,
  };

  Future<void> _run(Future<void> Function() action) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = _message(l10n, e.failure));
    } catch (_) {
      if (mounted) setState(() => _error = l10n.errGeneric);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitPhone() => _run(() async {
    final repo = ref.read(authRepositoryProvider);
    if (!_codeSent) {
      final e164 = toSaudiE164(_phone.text);
      if (!isValidSaudiPhone(e164)) {
        throw const AuthException(AuthFailure.invalidPhone);
      }
      await repo.startPhone(e164);
      if (mounted) setState(() => _codeSent = true);
    } else {
      await repo.confirmPhone(_code.text.trim());
    }
  });

  Future<void> _submitEmail() => _run(() async {
    final repo = ref.read(authRepositoryProvider);
    if (_creating) {
      await repo.createWithEmail(_email.text.trim(), _password.text);
    } else {
      await repo.signInWithEmail(_email.text.trim(), _password.text);
    }
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;

    return PageScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.authTitle, style: displayStyle(context, 28)),
          const SizedBox(height: 8),
          Text(l10n.authSubtitle, style: TextStyle(color: t.textMuted)),
          const SizedBox(height: 24),
          SegmentedButton<bool>(
            showSelectedIcon: false,
            style: SegmentedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: t.textMuted,
              selectedBackgroundColor: t.brand.withValues(alpha: 0.2),
              selectedForegroundColor: t.brandText,
              side: BorderSide(color: t.border.withValues(alpha: 0.35)),
              minimumSize: const Size.fromHeight(44),
            ),
            segments: [
              ButtonSegment(value: true, label: Text(l10n.tabPhone)),
              ButtonSegment(value: false, label: Text(l10n.tabEmail)),
            ],
            selected: {_phoneTab},
            onSelectionChanged: (s) => setState(() {
              _phoneTab = s.first;
              _error = null;
            }),
          ),
          const SizedBox(height: 24),
          if (_phoneTab) ...[
            TextField(
              textDirection: TextDirection.ltr,
              key: const Key('phone'),
              controller: _phone,
              enabled: !_codeSent,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumberNational],
              decoration: InputDecoration(
                labelText: l10n.phoneLabel,
                helperText: l10n.phoneHint,
                // LRM keeps "+966" from being reordered inside an RTL page.
                prefixText: '‎+966‎ ',
              ),
            ),
            if (_codeSent) ...[
              const SizedBox(height: 16),
              TextField(
                textDirection: TextDirection.ltr,
                key: const Key('code'),
                controller: _code,
                keyboardType: TextInputType.number,
                autofillHints: const [AutofillHints.oneTimeCode],
                decoration: InputDecoration(labelText: l10n.codeLabel),
              ),
            ],
          ] else ...[
            TextField(
              textDirection: TextDirection.ltr,
              key: const Key('email'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: InputDecoration(labelText: l10n.emailLabel),
            ),
            const SizedBox(height: 16),
            TextField(
              textDirection: TextDirection.ltr,
              key: const Key('password'),
              controller: _password,
              obscureText: true,
              autofillHints: [
                _creating ? AutofillHints.newPassword : AutofillHints.password,
              ],
              decoration: InputDecoration(labelText: l10n.passwordLabel),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Semantics(
              liveRegion: true,
              child: Text(
                _error!,
                style: TextStyle(color: t.danger, fontSize: 15),
              ),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton(
            key: const Key('submit'),
            onPressed: _busy ? null : (_phoneTab ? _submitPhone : _submitEmail),
            child: Text(
              _phoneTab
                  ? (_codeSent ? l10n.verify : l10n.sendCode)
                  : (_creating ? l10n.createAccount : l10n.signIn),
            ),
          ),
          if (!_phoneTab)
            TextButton(
              onPressed: () => setState(() => _creating = !_creating),
              child: Text(_creating ? l10n.toSignIn : l10n.toCreate),
            ),
        ],
      ),
    );
  }
}
