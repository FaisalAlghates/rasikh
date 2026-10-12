import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/evidence_camera.dart';
import '../data/evidence_queue.dart';
import '../data/firestore_inspection_repository.dart';
import '../data/inspection_models.dart';
import '../data/inspection_repository.dart';
import '../data/ops_models.dart' show Doc;
import '../features/inspect/device_camera.dart';
import 'ops_providers.dart';

final inspectionRepositoryProvider = Provider<InspectionRepository>(
  (ref) => FirestoreInspectionRepository(),
);

final evidenceCameraProvider = Provider<EvidenceCamera>(
  (ref) => const DeviceEvidenceCamera(),
);

/// Photos wait here (on the phone) until they are uploaded; see [EvidenceQueue].
final evidenceQueueProvider = Provider<EvidenceQueue>((ref) {
  final repo = ref.watch(inspectionRepositoryProvider);
  final queue = EvidenceQueue(
    // Files need a phone's storage; the browser build (a developer convenience) keeps the queue in memory.
    store: kIsWeb ? MemoryQueueStore() : FileQueueStore(),
    uploader: repo.uploadEvidence,
  );
  unawaited(queue.init());
  ref.onDispose(queue.dispose);
  return queue;
});

// A failed query (for example a rules denial) must not retry in a loop.
final inspectionsProvider =
    StreamProvider.autoDispose<List<Doc<InspectionDoc>>>((ref) {
      final scope = ref.watch(opsScopeProvider);
      if (scope == null) return Stream.value(const []);
      return ref
          .watch(inspectionRepositoryProvider)
          .inspections(scope.orgId, tenantUid: scope.staff ? null : scope.uid);
    }, retry: (_, _) => null);

typedef InspectionRef = ({String orgId, String id});

final inspectionItemsProvider = StreamProvider.autoDispose
    .family<List<Doc<InspectionItem>>, InspectionRef>(
      (ref, a) => ref.watch(inspectionRepositoryProvider).items(a.orgId, a.id),
      retry: (_, _) => null,
    );

final inspectionMediaProvider = StreamProvider.autoDispose
    .family<List<Doc<EvidenceMeta>>, InspectionRef>(
      (ref, a) => ref.watch(inspectionRepositoryProvider).media(a.orgId, a.id),
      retry: (_, _) => null,
    );
