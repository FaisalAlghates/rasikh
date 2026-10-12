import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/broker_repository.dart';
import '../data/ops_models.dart' show Doc;
import 'ops_providers.dart';

final brokerRepositoryProvider = Provider<BrokerRepository>(
  (ref) => FirestoreBrokerRepository(),
);

// A failed query (for example a rules denial) must not retry in a loop.
final brokerProfileProvider = StreamProvider.autoDispose<BrokerProfile?>((ref) {
  final s = ref.watch(opsScopeProvider);
  if (s == null || !s.broker) return Stream.value(null);
  return ref.watch(brokerRepositoryProvider).profile(s.orgId, s.uid);
}, retry: (_, _) => null);

StreamProvider<List<Doc<T>>> _mine<T>(
  Stream<List<Doc<T>>> Function(BrokerRepository r, String orgId, String uid)
  open,
) => StreamProvider.autoDispose<List<Doc<T>>>((ref) {
  final s = ref.watch(opsScopeProvider);
  if (s == null || !s.broker) return Stream.value(const []);
  return open(ref.watch(brokerRepositoryProvider), s.orgId, s.uid);
}, retry: (_, _) => null);

final brokerLeadsProvider = _mine<BLead>((r, o, u) => r.leads(o, u));
final brokerViewingsProvider = _mine<BViewing>((r, o, u) => r.viewings(o, u));
final brokerContractsProvider = _mine<BBrokerContract>(
  (r, o, u) => r.contracts(o, u),
);
final brokerActivityProvider = _mine<BActivity>((r, o, u) => r.activity(o, u));
