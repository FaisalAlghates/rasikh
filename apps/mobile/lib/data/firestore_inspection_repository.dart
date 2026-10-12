import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_storage/firebase_storage.dart';

import 'evidence_queue.dart';
import 'inspection_models.dart';
import 'inspection_repository.dart';
import 'ops_models.dart' show Doc;

class FirestoreInspectionRepository implements InspectionRepository {
  FirestoreInspectionRepository({
    FirebaseFirestore? db,
    FirebaseStorage? storage,
    FirebaseFunctions? functions,
  }) : _db = db ?? FirebaseFirestore.instance,
       _storage = storage ?? FirebaseStorage.instance,
       _functions =
           functions ?? FirebaseFunctions.instanceFor(region: 'me-central2');

  final FirebaseFirestore _db;
  final FirebaseStorage _storage;
  final FirebaseFunctions _functions;

  CollectionReference<Map<String, Object?>> _inspections(String orgId) =>
      _db.collection('orgs/$orgId/inspections');

  Stream<List<Doc<T>>> _watch<T>(
    Query<Map<String, Object?>> q,
    T Function(Map<String, Object?>) parse,
  ) => q.snapshots().map(
    (s) => [for (final d in s.docs) Doc(d.id, parse(d.data()))],
  );

  @override
  Stream<List<Doc<InspectionDoc>>> inspections(
    String orgId, {
    String? tenantUid,
  }) => _watch(
    tenantUid == null
        ? _inspections(orgId)
        : _inspections(orgId).where('tenantUid', isEqualTo: tenantUid),
    InspectionDoc.fromMap,
  );

  @override
  Stream<List<Doc<InspectionItem>>> items(String orgId, String inspectionId) =>
      _watch(
        _inspections(orgId).doc(inspectionId).collection('items'),
        InspectionItem.fromMap,
      );

  @override
  Stream<List<Doc<EvidenceMeta>>> media(String orgId, String inspectionId) =>
      _watch(
        _inspections(orgId).doc(inspectionId).collection('media'),
        EvidenceMeta.fromMap,
      );

  @override
  Future<String> createInspection(
    String orgId,
    String uid,
    NewInspection d,
  ) async {
    final ref = await _inspections(orgId).add({
      'unitId': d.unitId,
      'propertyId': d.propertyId,
      'leaseId': d.leaseId,
      if (d.tenantUid != null) 'tenantUid': d.tenantUid,
      'kind': d.kind,
      'rooms': d.rooms,
      if (d.moveInId != null) 'moveInId': d.moveInId,
      'status': 'draft',
      'createdBy': uid,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  @override
  Future<void> saveItem(
    String orgId,
    String inspectionId,
    InspectionItem item,
  ) =>
      _inspections(orgId)
          .doc(inspectionId)
          .collection('items')
          .doc(item.id)
          .set(item.toMap());

  @override
  Future<void> saveTenantComment(
    String orgId,
    String inspectionId,
    String comment,
  ) => _inspections(orgId).doc(inspectionId).update({'tenantComment': comment});

  @override
  Future<void> uploadEvidence(PendingEvidence e, Uint8List bytes) async {
    final inspection = _inspections(e.orgId).doc(e.inspectionId);
    final status = (await inspection.get()).data()?['status'];
    if (status != 'draft') throw const EvidenceRejected();

    // The queue entry id is the media id, so every retry targets the same file and the same document.
    final metaRef = inspection.collection('media').doc(e.id);
    final path = 'orgs/${e.orgId}/inspections/${e.inspectionId}/${e.id}.jpg';
    final fileRef = _storage.ref(path);

    if (!await _fileExists(fileRef)) {
      await fileRef.putData(bytes, SettableMetadata(contentType: 'image/jpeg'));
    }
    if (!(await metaRef.get()).exists) {
      await metaRef.set({
        'room': e.room,
        if (e.item != null) 'item': e.item,
        'path': path,
        'sha256': e.sha256,
        'size': e.size,
        'contentType': 'image/jpeg',
        'capturedAt': e.capturedAt,
        if (e.gps != null) 'gps': e.gps!.toMap(),
        'device': e.device,
        'source': 'in_app_camera',
        'uploadedBy': e.uid,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<bool> _fileExists(Reference ref) async {
    try {
      await ref.getMetadata();
      return true;
    } on FirebaseException catch (e) {
      if (e.code == 'object-not-found') return false;
      rethrow;
    }
  }

  @override
  Future<Uint8List> downloadEvidence(String path) async {
    final data = await _storage.ref(path).getData(26 * 1024 * 1024);
    if (data == null) throw StateError('empty file');
    return data;
  }

  @override
  Future<SignResult> sign(String orgId, String inspectionId) async {
    try {
      final r = await _functions.httpsCallable('signInspection').call({
        'orgId': orgId,
        'inspectionId': inspectionId,
      });
      final d = Map<String, Object?>.from(r.data as Map);
      return SignResult(d['status'] as String, d['party'] as String);
    } on FirebaseFunctionsException catch (e) {
      // Some SDK versions append the HTTP status: "media_hash_mismatch [400]".
      throw SignFailure(
        (e.message ?? 'generic').replaceFirst(RegExp(r'\s*\[\d+\]$'), ''),
      );
    }
  }
}
