import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/account_repository.dart';

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => FunctionsAccountRepository(),
);

final dataFileSharerProvider = Provider<DataFileSharer>(
  (ref) => const ShareDataFileSharer(),
);
