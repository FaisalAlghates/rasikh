import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => FirebaseAuthRepository(),
);

final sessionProvider = StreamProvider<SessionUser?>(
  (ref) => ref.watch(authRepositoryProvider).sessionChanges(),
);

/// Arabic is the default; the user can switch to English explicitly.
class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() => const Locale('ar');

  void toggle() => state = state.languageCode == 'ar'
      ? const Locale('en')
      : const Locale('ar');
}

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(
  LocaleNotifier.new,
);

/// Dark by default (Najd Dusk); the user can override.
class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.dark;

  void toggle() =>
      state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);
