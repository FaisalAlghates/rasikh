import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/building_repository.dart';
import '../data/ops_models.dart' show Doc;
import '../data/photo_picker.dart';
import 'ops_providers.dart';

final buildingRepositoryProvider = Provider<BuildingRepository>(
  (ref) => FirestoreBuildingRepository(),
);

final photoPickerProvider = Provider<PhotoPicker>(
  (ref) => const GalleryPhotoPicker(),
);

// Staff only (the security rules), and a failed query must not retry in a loop.
final buildingsProvider = StreamProvider.autoDispose<List<Doc<String>>>((ref) {
  final scope = ref.watch(opsScopeProvider);
  if (scope == null || !scope.staff) return Stream.value(const []);
  return ref.watch(buildingRepositoryProvider).buildings(scope.orgId);
}, retry: (_, _) => null);

typedef BuildingRef = ({String orgId, String id});

final bMembersProvider = StreamProvider.autoDispose
    .family<List<Doc<BMember>>, BuildingRef>(
      (ref, a) => ref.watch(buildingRepositoryProvider).members(a.orgId, a.id),
      retry: (_, _) => null,
    );
final bExpensesProvider = StreamProvider.autoDispose
    .family<List<Doc<BExpense>>, BuildingRef>(
      (ref, a) => ref.watch(buildingRepositoryProvider).expenses(a.orgId, a.id),
      retry: (_, _) => null,
    );
final bContributionsProvider = StreamProvider.autoDispose
    .family<List<Doc<BContribution>>, BuildingRef>(
      (ref, a) =>
          ref.watch(buildingRepositoryProvider).contributions(a.orgId, a.id),
      retry: (_, _) => null,
    );
final bQuotesProvider = StreamProvider.autoDispose
    .family<List<Doc<BQuote>>, BuildingRef>(
      (ref, a) => ref.watch(buildingRepositoryProvider).quotes(a.orgId, a.id),
      retry: (_, _) => null,
    );
final bVotesProvider = StreamProvider.autoDispose
    .family<List<Doc<BVote>>, BuildingRef>(
      (ref, a) => ref.watch(buildingRepositoryProvider).votes(a.orgId, a.id),
      retry: (_, _) => null,
    );
final bBallotsProvider = StreamProvider.autoDispose
    .family<List<Doc<String>>, ({String orgId, String id, String vote})>(
      (ref, a) =>
          ref.watch(buildingRepositoryProvider).ballots(a.orgId, a.id, a.vote),
      retry: (_, _) => null,
    );

/// Buildings the signed-in person owns a unit in (they cannot list a building collection, so the invite
/// function leaves them a membership record).
final myBuildingsProvider = StreamProvider.autoDispose<List<Doc<BMembership>>>((
  ref,
) {
  final scope = ref.watch(opsScopeProvider);
  if (scope == null || !scope.unitOwner) return Stream.value(const []);
  return ref.watch(buildingRepositoryProvider).memberships(scope.uid);
}, retry: (_, _) => null);
