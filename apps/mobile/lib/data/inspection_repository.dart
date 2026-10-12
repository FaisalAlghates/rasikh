import 'dart:typed_data';

import 'evidence_queue.dart';
import 'inspection_models.dart';
import 'ops_models.dart' show Doc;

/// The server refused a signature. [code] is the machine message from the function (for example
/// `media_hash_mismatch`), which the UI translates.
class SignFailure implements Exception {
  const SignFailure(this.code);
  final String code;
}

class SignResult {
  const SignResult(this.status, this.party);
  final String status, party;
  bool get sealed => status == 'sealed';
}

/// Inspections of one organization. The Firestore implementation lives next door; tests use a fake.
abstract class InspectionRepository {
  /// Tenants must pass their own uid: the security rules only allow queries scoped to `tenantUid`.
  Stream<List<Doc<InspectionDoc>>> inspections(
    String orgId, {
    String? tenantUid,
  });
  Stream<List<Doc<InspectionItem>>> items(String orgId, String inspectionId);
  Stream<List<Doc<EvidenceMeta>>> media(String orgId, String inspectionId);

  Future<String> createInspection(
    String orgId,
    String uid,
    NewInspection draft,
  );
  Future<void> saveItem(String orgId, String inspectionId, InspectionItem item);
  Future<void> saveTenantComment(
    String orgId,
    String inspectionId,
    String comment,
  );

  /// Stores one queued photo: the file first (write-once), then its metadata. Idempotent, so a retry after a
  /// half-finished attempt completes instead of failing. Throws [EvidenceRejected] when the inspection is no longer a draft.
  Future<void> uploadEvidence(PendingEvidence entry, Uint8List bytes);

  Future<Uint8List> downloadEvidence(String path);

  /// Signs as the owner side or the tenant (decided by the server). The caller must have re-authenticated just before.
  Future<SignResult> sign(String orgId, String inspectionId);
}
