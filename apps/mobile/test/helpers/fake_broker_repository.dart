import 'dart:async';

import 'package:rasikh/data/broker_repository.dart';
import 'package:rasikh/data/ops_models.dart' show Doc;
import 'package:rasikh/domain/broker.dart';

/// In-memory stand-in with the real rules: leads only move forward, and the log is append-only.
class FakeBrokerRepository implements BrokerRepository {
  final _changes = StreamController<void>.broadcast();
  BrokerProfile? _profile;
  final _leads = <Doc<BLead>>[];
  final _viewings = <Doc<BViewing>>[];
  final _contracts = <Doc<BBrokerContract>>[];
  final _log = <Doc<BActivity>>[];
  int _seq = 0;
  final calls = <String>[];

  Stream<T> _live<T>(T Function() read) async* {
    yield read();
    await for (final _ in _changes.stream) {
      yield read();
    }
  }

  void _touch() => _changes.add(null);

  /// The log entries in order, as the proof file would print them.
  List<BActivity> get logEntries => [for (final d in _log) d.data];

  @override
  Stream<BrokerProfile?> profile(String orgId, String uid) =>
      _live(() => _profile);
  @override
  Stream<List<Doc<BLead>>> leads(String orgId, String uid) =>
      _live(() => List.of(_leads));
  @override
  Stream<List<Doc<BViewing>>> viewings(String orgId, String uid) =>
      _live(() => List.of(_viewings));
  @override
  Stream<List<Doc<BBrokerContract>>> contracts(String orgId, String uid) =>
      _live(() => List.of(_contracts));
  @override
  Stream<List<Doc<BActivity>>> activity(String orgId, String uid) =>
      _live(() => List.of(_log));

  void _add(String leadId, String type, String text) {
    _log.add(
      Doc(
        'e${++_seq}',
        BActivity(leadId, type, text, DateTime.utc(2026, 10, 12, 8, _seq)),
      ),
    );
  }

  @override
  Future<void> saveProfile(String orgId, String uid, BrokerProfile p) async {
    calls.add('profile:${p.falNo}');
    _profile = p;
    _touch();
  }

  @override
  Future<String> addLead(String orgId, String uid, BLead lead) async {
    calls.add('lead:${lead.name}');
    final id = 'l${++_seq}';
    _leads.add(
      Doc(
        id,
        BLead(
          name: lead.name,
          phone: lead.phone,
          interest: lead.interest,
          source: lead.source,
          status: 'new',
          budgetSar: lead.budgetSar,
        ),
      ),
    );
    _add(id, 'lead_created', lead.name);
    _touch();
    return id;
  }

  @override
  Future<void> moveLead(
    String orgId,
    String uid,
    String leadId,
    String from,
    String to, {
    required String fromLabel,
    required String toLabel,
  }) async {
    if (!canMoveLead(from, to)) throw StateError('lead cannot move $from→$to');
    final i = _leads.indexWhere((x) => x.id == leadId);
    final o = _leads[i].data;
    _leads[i] = Doc(
      leadId,
      BLead(
        name: o.name,
        phone: o.phone,
        interest: o.interest,
        source: o.source,
        status: to,
        budgetSar: o.budgetSar,
      ),
    );
    calls.add('move:$to');
    _add(leadId, 'status_changed', '$fromLabel → $toLabel');
    _touch();
  }

  @override
  Future<void> addViewing(
    String orgId,
    String uid,
    String leadId,
    String place,
    DateTime when,
  ) async {
    calls.add('viewing:$place');
    _viewings.add(
      Doc(
        'v${++_seq}',
        BViewing(leadId, place, when.toUtc().toIso8601String(), false),
      ),
    );
    _add(leadId, 'viewing_scheduled', place);
    _touch();
  }

  @override
  Future<void> markViewingDone(
    String orgId,
    String uid,
    String leadId,
    String viewingId,
    String place,
  ) async {
    final i = _viewings.indexWhere((x) => x.id == viewingId);
    final o = _viewings[i].data;
    _viewings[i] = Doc(
      viewingId,
      BViewing(o.leadId, o.placeLabel, o.scheduledAt, true),
    );
    calls.add('viewingDone');
    _add(leadId, 'viewing_done', place);
    _touch();
  }

  @override
  Future<void> addContract(
    String orgId,
    String uid,
    String leadId,
    String type,
    String contractNo,
    String start,
    String end,
  ) async {
    calls.add('contract:$contractNo');
    _contracts.add(
      Doc('c${++_seq}', BBrokerContract(leadId, type, contractNo, start, end)),
    );
    _add(leadId, 'contract_added', contractNo);
    _touch();
  }

  @override
  Future<void> addNote(
    String orgId,
    String uid,
    String leadId,
    String text,
  ) async {
    calls.add('note');
    _add(leadId, 'note', text);
    _touch();
  }
}
