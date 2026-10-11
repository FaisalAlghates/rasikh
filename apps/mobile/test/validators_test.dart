import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/data/validators.dart';

void main() {
  group('toSaudiE164', () {
    test('normalises common input shapes', () {
      expect(toSaudiE164('512345678'), '+966512345678');
      expect(toSaudiE164('0512345678'), '+966512345678');
      expect(toSaudiE164('+966 51 234 5678'), '+966512345678');
      expect(toSaudiE164('966512345678'), '+966512345678');
    });
  });

  group('isValidSaudiPhone', () {
    test('accepts +9665XXXXXXXX', () => expect(isValidSaudiPhone('+966512345678'), isTrue));
    test('rejects other numbers', () {
      expect(isValidSaudiPhone('+971512345678'), isFalse);
      expect(isValidSaudiPhone('+96611234567'), isFalse);
      expect(isValidSaudiPhone('+9665123'), isFalse);
      expect(isValidSaudiPhone(toSaudiE164('1234')), isFalse);
    });
  });
}
