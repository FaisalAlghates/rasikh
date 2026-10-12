import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/ops_models.dart' show Doc;
import '../data/ticket_models.dart';
import '../data/ticket_repository.dart';
import 'ops_providers.dart';

final ticketRepositoryProvider = Provider<TicketRepository>(
  (ref) => FirestoreTicketRepository(),
);

// A failed query (for example a rules denial) must not retry in a loop.
final ticketsProvider = StreamProvider.autoDispose<List<Doc<TicketDoc>>>((ref) {
  final scope = ref.watch(opsScopeProvider);
  if (scope == null) return Stream.value(const []);
  return ref
      .watch(ticketRepositoryProvider)
      .tickets(
        scope.orgId,
        tenantUid: scope.staff || scope.vendor ? null : scope.uid,
        vendorUid: scope.vendor ? scope.uid : null,
      );
}, retry: (_, _) => null);
