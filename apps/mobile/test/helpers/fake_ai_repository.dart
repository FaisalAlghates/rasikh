import 'package:rasikh/data/ai_repository.dart';

/// Replays what the server would send: an answer, a refusal or a failure.
class FakeAiRepository implements AiRepository {
  AiResult Function(String feature, Map<String, Object?> input) respond =
      (_, _) => const AiAnswer(
        label: 'مُولَّد بالذكاء الاصطناعي، راجعه قبل الاعتماد',
        text: 'عدد العقود المتاحة لك: 1',
        citations: ['عقد 10203040'],
        disclaimers: [],
      );
  AiFailure? failWith;
  final asked = <({String feature, Map<String, Object?> input})>[];

  @override
  Future<AiResult> ask(
    String orgId,
    String feature,
    Map<String, Object?> input,
  ) async {
    asked.add((feature: feature, input: input));
    if (failWith != null) throw AiException(failWith!);
    return respond(feature, input);
  }
}
