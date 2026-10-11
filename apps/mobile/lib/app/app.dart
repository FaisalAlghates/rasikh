import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import 'providers.dart';
import 'router.dart';

class RasikhApp extends ConsumerWidget {
  const RasikhApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final arabic = locale.languageCode == 'ar';

    return MaterialApp.router(
      onGenerateTitle: (ctx) => AppLocalizations.of(ctx).appName,
      debugShowCheckedModeBanner: false,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: buildTheme(Brightness.light, arabic: arabic),
      darkTheme: buildTheme(Brightness.dark, arabic: arabic),
      themeMode: ThemeMode.dark, // dark by default (Najd Dusk); user override comes in Phase 2
      routerConfig: ref.watch(routerProvider),
    );
  }
}
