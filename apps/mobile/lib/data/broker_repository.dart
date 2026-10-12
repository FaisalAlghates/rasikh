import 'package:cloud_firestore/cloud_firestore.dart';

import 'ops_models.dart' show Doc;

class BrokerProfile {
  const BrokerProfile(this.displayName, this.falNo, this.falExpiry);
  final String displayName, falNo, falExpiry;
}

class BLead {
  const BLead({
    required this.name,
    required this.phone,
    required this.interest,
    required this.source,
    required this.status,
    this.budgetSar,
  });
  final String name, phone, interest, source, status;
  final double? budgetSar;
}

class BViewing {
  const BViewing(this.leadId, this.placeLabel, this.scheduledAt, this.done);
  final String leadId, placeLabel;

  /// ISO 8601.
  final String scheduledAt;
  final bool done;
}

class BBrokerContract {
  const BBrokerContract(
    this.leadId,
    this.type,
    this.contractNo,
    this.startDate,
    this.endDate,
  );
  final String leadId, type, contractNo, startDate, endDate;
}

class BActivity {
  const BActivity(this.leadId, this.type, this.text, this.at);
  final String leadId, type, text;

  /// Server time; null while the write is still pending locally.
  final DateTime? at;
}

/// A broker's own records. Leads, viewings, contracts and the log are private to that broker (the rules);
/// the activity log is create-only and time-stamped by the server.
abstract class BrokerRepository {
  Stream<BrokerProfile?> profile(String orgId, String uid);
  Stream<List<Doc<BLead>>> leads(String orgId, String uid);
  Stream<List<Doc<BViewing>>> viewings(String orgId, String uid);
  Stream<List<Doc<BBrokerContract>>> contracts(String orgId, String uid);
  Stream<List<Doc<BActivity>>> activity(String orgId, String uid);

  Future<void> saveProfile(String orgId, String uid, BrokerProfile p);

  /// Creates the lead as "new" and writes the first log entry.
  Future<String> addLead(String orgId, String uid, BLead lead);
  Future<void> moveLead(
    String orgId,
    String uid,
    String leadId,
    String from,
    String to, {
    required String fromLabel,
    required String toLabel,
  });
  Future<void> addViewing(
    String orgId,
    String uid,
    String leadId,
    String place,
    DateTime when,
  );
  Future<void> markViewingDone(
    String orgId,
    String uid,
    String leadId,
    String viewingId,
    String place,
  );
  Future<void> addContract(
    String orgId,
    String uid,
    String leadId,
    String type,
    String contractNo,
    String start,
    String end,
  );
  Future<void> addNote(String orgId, String uid, String leadId, String text);
}

class FirestoreBrokerRepository implements BrokerRepository {
  FirestoreBrokerRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;
  final FirebaseFirestore _db;

  String _s(Object? v) => (v as String?) ?? '';

  Stream<List<Doc<T>>> _mine<T>(
    String orgId,
    String name,
    String uid,
    T Function(Map<String, Object?>) f,
  ) => _db
      .collection('orgs/$orgId/$name')
      .where('brokerUid', isEqualTo: uid)
      .snapshots()
      .map((s) => [for (final d in s.docs) Doc(d.id, f(d.data()))]);

  @override
  Stream<BrokerProfile?> profile(String orgId, String uid) => _db
      .doc('orgs/$orgId/brokers/$uid')
      .snapshots()
      .map(
        (s) => s.exists
            ? BrokerProfile(
                _s(s.data()?['displayName']),
                _s(s.data()?['falNo']),
                _s(s.data()?['falExpiry']),
              )
            : null,
      );

  @override
  Stream<List<Doc<BLead>>> leads(String orgId, String uid) =>
      _mine(orgId, 'leads', uid, (m) {
        return BLead(
          name: _s(m['name']),
          phone: _s(m['phone']),
          interest: _s(m['interest']),
          source: _s(m['source']),
          status: _s(m['status']),
          budgetSar: (m['budgetSar'] as num?)?.toDouble(),
        );
      });

  @override
  Stream<List<Doc<BViewing>>> viewings(String orgId, String uid) =>
      _mine(orgId, 'viewings', uid, (m) {
        return BViewing(
          _s(m['leadId']),
          _s(m['placeLabel']),
          _s(m['scheduledAt']),
          (m['done'] as bool?) ?? false,
        );
      });

  @override
  Stream<List<Doc<BBrokerContract>>> contracts(String orgId, String uid) =>
      _mine(orgId, 'brokerContracts', uid, (m) {
        return BBrokerContract(
          _s(m['leadId']),
          _s(m['type']),
          _s(m['contractNo']),
          _s(m['startDate']),
          _s(m['endDate']),
        );
      });

  @override
  Stream<List<Doc<BActivity>>> activity(String orgId, String uid) =>
      _mine(orgId, 'brokerActivity', uid, (m) {
        return BActivity(
          _s(m['leadId']),
          _s(m['type']),
          _s(m['text']),
          (m['createdAt'] as Timestamp?)?.toDate(),
        );
      });

  @override
  Future<void> saveProfile(String orgId, String uid, BrokerProfile p) =>
      _db.doc('orgs/$orgId/brokers/$uid').set({
        'displayName': p.displayName,
        'falNo': p.falNo,
        'falExpiry': p.falExpiry,
      });

  Future<void> _log(
    String orgId,
    String uid,
    String leadId,
    String type,
    String text,
  ) => _db.collection('orgs/$orgId/brokerActivity').add({
    'leadId': leadId,
    'type': type,
    'text': text.length > 300 ? text.substring(0, 300) : text,
    'brokerUid': uid,
    'createdAt': FieldValue.serverTimestamp(),
  });

  @override
  Future<String> addLead(String orgId, String uid, BLead lead) async {
    final ref = await _db.collection('orgs/$orgId/leads').add({
      'name': lead.name,
      'phone': lead.phone,
      'interest': lead.interest,
      'source': lead.source,
      if (lead.budgetSar != null) 'budgetSar': lead.budgetSar,
      'status': 'new',
      'brokerUid': uid,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await _log(orgId, uid, ref.id, 'lead_created', lead.name);
    return ref.id;
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
    await _db.doc('orgs/$orgId/leads/$leadId').update({'status': to});
    await _log(orgId, uid, leadId, 'status_changed', '$fromLabel → $toLabel');
  }

  @override
  Future<void> addViewing(
    String orgId,
    String uid,
    String leadId,
    String place,
    DateTime when,
  ) async {
    await _db.collection('orgs/$orgId/viewings').add({
      'leadId': leadId,
      'placeLabel': place,
      'scheduledAt': when.toUtc().toIso8601String(),
      'done': false,
      'brokerUid': uid,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await _log(orgId, uid, leadId, 'viewing_scheduled', place);
  }

  @override
  Future<void> markViewingDone(
    String orgId,
    String uid,
    String leadId,
    String viewingId,
    String place,
  ) async {
    await _db.doc('orgs/$orgId/viewings/$viewingId').update({'done': true});
    await _log(orgId, uid, leadId, 'viewing_done', place);
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
    await _db.collection('orgs/$orgId/brokerContracts').add({
      'leadId': leadId,
      'type': type,
      'contractNo': contractNo,
      'startDate': start,
      'endDate': end,
      'brokerUid': uid,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await _log(orgId, uid, leadId, 'contract_added', contractNo);
  }

  @override
  Future<void> addNote(String orgId, String uid, String leadId, String text) =>
      _log(orgId, uid, leadId, 'note', text);
}
