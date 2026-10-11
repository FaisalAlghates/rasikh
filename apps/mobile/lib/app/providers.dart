import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) => FirebaseAuthRepository());

final sessionProvider = StreamProvider<SessionUser?>(
  (ref) => ref.watch(authRepositoryProvider).sessionChanges(),
);

/// Arabic is the default; the user can switch to English explicitly.
class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() => const Locale('ar');

  void toggle() => state = state.languageCode == 'ar' ? const Locale('en') : const Locale('ar');
}

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(LocaleNotifier.new);
