/// Mirrors `SaudiPhoneSchema` in packages/shared (E.164 Saudi mobile: +9665XXXXXXXX).
final _saudiPhone = RegExp(r'^\+9665\d{8}$');

/// Normalises user input ("05XXXXXXXX", "5XXXXXXXX", "+966 5X...") to E.164.
String toSaudiE164(String input) {
  var digits = input.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('966')) digits = digits.substring(3);
  if (digits.startsWith('0')) digits = digits.substring(1);
  return '+966$digits';
}

bool isValidSaudiPhone(String e164) => _saudiPhone.hasMatch(e164);
