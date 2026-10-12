import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/ai_repository.dart';

final aiRepositoryProvider = Provider<AiRepository>(
  (ref) => FunctionsAiRepository(),
);
