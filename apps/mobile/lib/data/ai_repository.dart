import 'package:cloud_functions/cloud_functions.dart';

/// What the server returned. [ai] is always true on an answer: the screen must mark it and never apply it silently.
sealed class AiResult {
  const AiResult();
}

class AiAnswer extends AiResult {
  const AiAnswer({
    required this.label,
    required this.text,
    required this.citations,
    required this.disclaimers,
    this.suggestion,
  });
  final String label, text;
  final List<String> citations, disclaimers;
  final Map<String, Object?>? suggestion;
}

/// The question was outside the product's scope or tried to override its rules; [message] is the polite Arabic text.
class AiRefused extends AiResult {
  const AiRefused(this.message);
  final String message;
}

enum AiFailure { dailyLimit, monthlyCap, unavailable, notAllowed, generic }

class AiException implements Exception {
  const AiException(this.failure);
  final AiFailure failure;
}

abstract class AiRepository {
  Future<AiResult> ask(
    String orgId,
    String feature,
    Map<String, Object?> input,
  );
}

class FunctionsAiRepository implements AiRepository {
  FunctionsAiRepository({FirebaseFunctions? functions})
    : _functions =
          functions ?? FirebaseFunctions.instanceFor(region: 'me-central2');
  final FirebaseFunctions _functions;

  @override
  Future<AiResult> ask(
    String orgId,
    String feature,
    Map<String, Object?> input,
  ) async {
    try {
      final res = await _functions.httpsCallable('aiAssist').call({
        'orgId': orgId,
        'feature': feature,
        'input': input,
      });
      final m = Map<String, Object?>.from(res.data as Map);
      if (m['ok'] != true) return AiRefused((m['message'] as String?) ?? '');
      return AiAnswer(
        label: (m['label'] as String?) ?? '',
        text: (m['text'] as String?) ?? '',
        citations: [
          for (final c in (m['citations'] as List? ?? const []))
            ((c as Map)['label'] as String?) ?? '',
        ],
        disclaimers: [
          for (final d in (m['disclaimers'] as List? ?? const [])) d as String,
        ],
        suggestion: m['suggestion'] == null
            ? null
            : Map<String, Object?>.from(m['suggestion'] as Map),
      );
    } on FirebaseFunctionsException catch (e) {
      final msg = e.message ?? '';
      throw AiException(
        msg.contains('daily_limit')
            ? AiFailure.dailyLimit
            : msg.contains('monthly_cap')
            ? AiFailure.monthlyCap
            : e.code == 'unavailable'
            ? AiFailure.unavailable
            : e.code == 'permission-denied'
            ? AiFailure.notAllowed
            : AiFailure.generic,
      );
    }
  }
}
