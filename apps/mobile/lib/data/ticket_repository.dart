import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_storage/firebase_storage.dart';

import 'ops_models.dart' show Doc;
import 'photo_picker.dart';
import 'ticket_models.dart';

abstract class TicketRepository {
  /// Tenants must pass their own uid: the security rules only allow queries scoped to `tenantUid`.
  Stream<List<Doc<TicketDoc>>> tickets(String orgId, {String? tenantUid});
  Future<String> create(
    String orgId,
    NewTicket ticket, [
    List<PickedFile> photos = const [],
  ]);

  /// `action` is one of assign, start, resolve, close, cancel; the server decides who may do what.
  Future<void> act(
    String orgId,
    String ticketId,
    String action, [
    Map<String, Object?> extra = const {},
  ]);
}

class FirestoreTicketRepository implements TicketRepository {
  FirestoreTicketRepository({
    FirebaseFirestore? db,
    FirebaseFunctions? functions,
  }) : _db = db ?? FirebaseFirestore.instance,
       _fn = functions ?? FirebaseFunctions.instanceFor(region: 'me-central2');
  final FirebaseFirestore _db;
  final FirebaseFunctions _fn;

  @override
  Stream<List<Doc<TicketDoc>>> tickets(String orgId, {String? tenantUid}) {
    final col = _db.collection('orgs/$orgId/tickets');
    final q = tenantUid == null
        ? col
        : col.where('tenantUid', isEqualTo: tenantUid);
    return q.snapshots().map(
      (s) => [for (final d in s.docs) Doc(d.id, TicketDoc.fromMap(d.data()))],
    );
  }

  Future<T> _call<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on FirebaseFunctionsException catch (e) {
      // Some SDK versions append the HTTP status: "transition_not_allowed [400]".
      throw TicketFailure(
        (e.message ?? 'generic').replaceFirst(RegExp(r'\s*\[\d+\]$'), ''),
      );
    }
  }

  @override
  Future<String> create(
    String orgId,
    NewTicket ticket, [
    List<PickedFile> photos = const [],
  ]) async {
    final id = _db.collection('orgs/$orgId/tickets').doc().id;
    final paths = <String>[];
    for (var i = 0; i < photos.length; i++) {
      final path =
          'orgs/$orgId/tickets/$id/${DateTime.now().millisecondsSinceEpoch}-$i.jpg';
      await FirebaseStorage.instance
          .ref(path)
          .putData(
            photos[i].bytes,
            SettableMetadata(contentType: 'image/jpeg'),
          );
      paths.add(path);
    }
    await _call(
      () => _fn.httpsCallable('createTicket').call({
        'orgId': orgId,
        'ticketId': id,
        'ticket': ticket.toMap(),
        'photos': paths,
      }),
    );
    return id;
  }

  @override
  Future<void> act(
    String orgId,
    String ticketId,
    String action, [
    Map<String, Object?> extra = const {},
  ]) => _call(
    () => _fn.httpsCallable('ticketAction').call({
      'orgId': orgId,
      'ticketId': ticketId,
      'input': {'action': action, ...extra},
    }),
  );
}
