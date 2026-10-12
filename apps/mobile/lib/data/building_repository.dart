import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';

import 'ops_models.dart' show Doc;
import 'photo_picker.dart';

class BMember {
  const BMember(this.name, this.unitLabel, this.shareBp);
  final String name, unitLabel;
  final int shareBp;
}

class BExpense {
  const BExpense(this.title, this.amount, this.date, this.receiptPath);
  final String title, date, receiptPath;
  final double amount;
}

class BContribution {
  const BContribution(this.memberId, this.amount, this.date);
  final String memberId, date;
  final double amount;
}

class BQuote {
  const BQuote(this.request, this.vendor, this.amount);
  final String request, vendor;
  final double amount;
}

class BVote {
  const BVote(this.title, this.rule, this.closed);
  final String title, rule;
  final bool closed;
}

/// Owners-association bookkeeping for one organization (staff only). The ledger is append-only.
abstract class BuildingRepository {
  Stream<List<Doc<String>>> buildings(String orgId);
  Stream<List<Doc<BMember>>> members(String orgId, String bid);
  Stream<List<Doc<BExpense>>> expenses(String orgId, String bid);
  Stream<List<Doc<BContribution>>> contributions(String orgId, String bid);
  Stream<List<Doc<BQuote>>> quotes(String orgId, String bid);
  Stream<List<Doc<BVote>>> votes(String orgId, String bid);
  Stream<List<Doc<String>>> ballots(String orgId, String bid, String voteId);

  Future<void> addBuilding(String orgId, String name);
  Future<void> addMember(String orgId, String bid, BMember m);

  /// Uploads the receipt first, then writes the expense; a receipt is required for every shared expense.
  Future<void> addExpense(
    String orgId,
    String bid,
    String title,
    double amount,
    String date,
    PickedFile receipt,
  );
  Future<void> addContribution(String orgId, String bid, BContribution c);
  Future<void> addQuote(String orgId, String bid, BQuote q);
  Future<void> addVote(String orgId, String bid, String title, String rule);
  Future<void> castBallot(
    String orgId,
    String bid,
    String voteId,
    String memberId,
    String choice,
  );
  Future<void> closeVote(String orgId, String bid, String voteId);
}

class FirestoreBuildingRepository implements BuildingRepository {
  FirestoreBuildingRepository({FirebaseFirestore? db, FirebaseStorage? storage})
    : _db = db ?? FirebaseFirestore.instance,
      _storage = storage ?? FirebaseStorage.instance;
  final FirebaseFirestore _db;
  final FirebaseStorage _storage;

  CollectionReference<Map<String, Object?>> _c(
    String orgId,
    String bid,
    String name,
  ) => _db.collection('orgs/$orgId/buildings/$bid/$name');

  Stream<List<Doc<T>>> _w<T>(
    CollectionReference<Map<String, Object?>> c,
    T Function(Map<String, Object?>) f,
  ) => c.snapshots().map(
    (s) => [for (final d in s.docs) Doc(d.id, f(d.data()))],
  );

  double _n(Object? v) => (v as num?)?.toDouble() ?? 0;
  String _s(Object? v) => (v as String?) ?? '';

  @override
  Stream<List<Doc<String>>> buildings(String orgId) =>
      _w(_db.collection('orgs/$orgId/buildings'), (m) => _s(m['name']));
  @override
  Stream<List<Doc<BMember>>> members(String orgId, String bid) => _w(
    _c(orgId, bid, 'members'),
    (m) => BMember(_s(m['name']), _s(m['unitLabel']), _n(m['shareBp']).toInt()),
  );
  @override
  Stream<List<Doc<BExpense>>> expenses(String orgId, String bid) => _w(
    _c(orgId, bid, 'expenses'),
    (m) => BExpense(
      _s(m['title']),
      _n(m['amount']),
      _s(m['date']),
      _s(m['receiptPath']),
    ),
  );
  @override
  Stream<List<Doc<BContribution>>> contributions(String orgId, String bid) =>
      _w(
        _c(orgId, bid, 'contributions'),
        (m) => BContribution(_s(m['memberId']), _n(m['amount']), _s(m['date'])),
      );
  @override
  Stream<List<Doc<BQuote>>> quotes(String orgId, String bid) => _w(
    _c(orgId, bid, 'quotes'),
    (m) => BQuote(_s(m['request']), _s(m['vendor']), _n(m['amount'])),
  );
  @override
  Stream<List<Doc<BVote>>> votes(String orgId, String bid) => _w(
    _c(orgId, bid, 'votes'),
    (m) => BVote(_s(m['title']), _s(m['rule']), m['closed'] == true),
  );
  @override
  Stream<List<Doc<String>>> ballots(String orgId, String bid, String voteId) =>
      _w(
        _c(orgId, bid, 'votes').doc(voteId).collection('ballots'),
        (m) => _s(m['choice']),
      );

  @override
  Future<void> addBuilding(String orgId, String name) =>
      _db.collection('orgs/$orgId/buildings').add({'name': name});

  @override
  Future<void> addMember(String orgId, String bid, BMember m) => _c(
    orgId,
    bid,
    'members',
  ).add({'name': m.name, 'unitLabel': m.unitLabel, 'shareBp': m.shareBp});

  @override
  Future<void> addExpense(
    String orgId,
    String bid,
    String title,
    double amount,
    String date,
    PickedFile receipt,
  ) async {
    final safe = receipt.name.replaceAll(RegExp(r'[^\w.-]'), '_');
    final path =
        'orgs/$orgId/receipts/b-${DateTime.now().millisecondsSinceEpoch}-$safe';
    await _storage
        .ref(path)
        .putData(
          receipt.bytes,
          SettableMetadata(contentType: receipt.contentType),
        );
    await _c(orgId, bid, 'expenses').add({
      'title': title,
      'amount': amount,
      'date': date,
      'receiptPath': path,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> addContribution(String orgId, String bid, BContribution c) =>
      _c(orgId, bid, 'contributions').add({
        'memberId': c.memberId,
        'amount': c.amount,
        'date': c.date,
        'createdAt': FieldValue.serverTimestamp(),
      });

  @override
  Future<void> addQuote(String orgId, String bid, BQuote q) => _c(
    orgId,
    bid,
    'quotes',
  ).add({'request': q.request, 'vendor': q.vendor, 'amount': q.amount});

  @override
  Future<void> addVote(String orgId, String bid, String title, String rule) =>
      _c(orgId, bid, 'votes').add({
        'title': title,
        'rule': rule,
        'closed': false,
        'createdAt': FieldValue.serverTimestamp(),
      });

  @override
  Future<void> castBallot(
    String orgId,
    String bid,
    String voteId,
    String memberId,
    String choice,
  ) => _c(
    orgId,
    bid,
    'votes',
  ).doc(voteId).collection('ballots').doc(memberId).set({'choice': choice});

  @override
  Future<void> closeVote(String orgId, String bid, String voteId) =>
      _c(orgId, bid, 'votes').doc(voteId).update({'closed': true});
}
