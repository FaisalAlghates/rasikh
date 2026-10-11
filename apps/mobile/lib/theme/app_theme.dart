import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'rasikh_tokens.g.dart';

/// Tests turn this off so they never reach the network.
abstract final class FontConfig {
  static bool webFonts = true;
}

ThemeData buildTheme(Brightness brightness, {required bool arabic}) {
  final t = brightness == Brightness.dark
      ? RasikhTokens.dark
      : RasikhTokens.light;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: t.brand,
    onPrimary: t.onBrand,
    secondary: t.brandText,
    onSecondary: t.bg,
    error: t.danger,
    onError: t.bg,
    surface: t.surface,
    onSurface: t.text,
  );
  final body = !FontConfig.webFonts
      ? ThemeData(brightness: brightness).textTheme
      : (arabic
            ? GoogleFonts.ibmPlexSansArabicTextTheme()
            : GoogleFonts.ibmPlexSansTextTheme());
  final text = body.apply(bodyColor: t.text, displayColor: t.text);

  final border = BorderSide(color: t.border.withValues(alpha: 0.3));
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: t.bg,
    textTheme: text.copyWith(
      bodyLarge: text.bodyLarge?.copyWith(
        fontSize: 17,
        height: arabic ? 1.7 : 1.5,
      ),
      bodyMedium: text.bodyMedium?.copyWith(
        fontSize: 15,
        height: arabic ? 1.7 : 1.5,
      ),
      bodySmall: text.bodySmall?.copyWith(fontSize: 13, color: t.textMuted),
    ),
    extensions: [t],
    dividerColor: border.color,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: t.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
        borderSide: border,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
        borderSide: border,
      ),
      labelStyle: TextStyle(color: t.textMuted),
      helperStyle: TextStyle(color: t.textMuted, fontSize: 13),
      errorStyle: TextStyle(color: t.danger, fontSize: 13),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: t.brand,
        foregroundColor: t.onBrand,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
        ),
        textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w500),
      ),
    ),
    splashFactory: NoSplash.splashFactory,
  );
}

/// Display face: Reem Kufi for Arabic, Fraunces for Latin.
TextStyle displayStyle(BuildContext context, double size) {
  final arabic = Directionality.of(context) == TextDirection.rtl;
  final color = Theme.of(context).colorScheme.onSurface;
  if (!FontConfig.webFonts) return TextStyle(fontSize: size, color: color);
  return arabic
      ? GoogleFonts.reemKufi(fontSize: size, color: color, height: 1.25)
      : GoogleFonts.fraunces(fontSize: size, color: color, height: 1.15);
}

extension RasikhThemeX on BuildContext {
  RasikhTokens get tokens => Theme.of(this).extension<RasikhTokens>()!;
}
