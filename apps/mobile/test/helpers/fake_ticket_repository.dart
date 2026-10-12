import 'dart:async';

import 'package:rasikh/data/ops_models.dart' show Doc;
import 'package:rasikh/data/photo_picker.dart';
import 'package:rasikh/data/ticket_models.dart';
import 'package:rasikh/data/ticket_repository.dart';
import 'package:rasikh/domain/maintenance.dart';

/// In-memory stand-in for Firestore plus the createTicket / ticketAction functions, with the same status machine.
class FakeTicketRepository implements TicketRepository {
  final _changes = StreamController<void>.broadcast();
  final _tickets = <String, Map<String, Object?>>{};
  int _seq = 0;
  final calls = <String>[];
  int photoCount = 0;

  /// Which party the signed-in test user is (the real server decides this from the account).
  String party = 'staff';
  String? tenantUid;

  Stream<List<Doc<TicketDoc>>> _live(
    bool Function(Map<String, Object?>) keep,
  ) async* {
    List<Doc<TicketDoc>> read() => [
      for (final e in _tickets.entries)
        if (keep(e.value)) Doc(e.key, TicketDoc.fromMap(e.value)),
    ];
    yield read();
    await for (final _ in _changes.stream) {
      yield read();
    }
  }

  @override
  Stream<List<Doc<TicketDoc>>> tickets(String orgId, {String? tenantUid}) =>
      _live((m) => tenantUid == null || m['tenantUid'] == tenantUid);

  @override
  Future<String> create(
    String orgId,
    NewTicket t, [
    List<PickedFile> photos = const [],
  ]) async {
    final id = 'tk${++_seq}';
    calls.add('create:${t.title}');
    photoCount = photos.length;
    _tickets[id] = {
      ...t.toMap(),
      if (tenantUid != null) 'tenantUid': tenantUid,
      'status': 'open',
      'suggestedParty': suggestResponsibility(t.category),
      'createdAtIso': DateTime.now().toUtc().toIso8601String(),
    };
    _changes.add(null);
    return id;
  }

  @override
  Future<void> act(
    String orgId,
    String ticketId,
    String action, [
    Map<String, Object?> extra = const {},
  ]) async {
    final t = _tickets[ticketId]!;
    final to = nextStatus(t['status']! as String, action, party);
    if (to == null) throw const TicketFailure('transition_not_allowed');
    calls.add('act:$action');
    t['status'] = to;
    if (action == 'assign') {
      t['vendorName'] = extra['vendorName'];
      t['vendorPhone'] = extra['vendorPhone'];
    }
    if (action == 'resolve') {
      t['resolution'] = extra['note'];
      t['resolvedAtIso'] = DateTime.now().toUtc().toIso8601String();
    }
    if (action == 'close' && extra['rating'] != null) {
      t['rating'] = extra['rating'];
    }
    _changes.add(null);
  }
}
