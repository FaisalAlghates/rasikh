import 'dart:async';
import 'dart:typed_data';

import 'package:rasikh/data/building_repository.dart';
import 'package:rasikh/data/ops_models.dart' show Doc;
import 'package:rasikh/data/photo_picker.dart';

/// In-memory stand-in with the same rules as the real ledger: a receipt per expense, one ballot per unit.
class FakeBuildingRepository implements BuildingRepository {
  final _changes = StreamController<void>.broadcast();
  final _b = <Doc<String>>[];
  final _m = <Doc<BMember>>[];
  final _e = <Doc<BExpense>>[];
  final _c = <Doc<BContribution>>[];
  final _q = <Doc<BQuote>>[];
  final _v = <Doc<BVote>>[];
  final _ballots = <String, Map<String, String>>{};
  int _seq = 0;
  final calls = <String>[];

  Stream<List<T>> _live<T>(List<T> Function() read) async* {
    yield read();
    await for (final _ in _changes.stream) {
      yield read();
    }
  }

  String _id(String p) => '$p${++_seq}';
  void _touch() => _changes.add(null);

  @override
  Stream<List<Doc<String>>> buildings(String orgId) => _live(() => List.of(_b));
  @override
  Stream<List<Doc<BMember>>> members(String orgId, String bid) =>
      _live(() => List.of(_m));
  @override
  Stream<List<Doc<BExpense>>> expenses(String orgId, String bid) =>
      _live(() => List.of(_e));
  @override
  Stream<List<Doc<BContribution>>> contributions(String orgId, String bid) =>
      _live(() => List.of(_c));
  @override
  Stream<List<Doc<BQuote>>> quotes(String orgId, String bid) =>
      _live(() => List.of(_q));
  @override
  Stream<List<Doc<BVote>>> votes(String orgId, String bid) =>
      _live(() => List.of(_v));
  @override
  Stream<List<Doc<String>>> ballots(String orgId, String bid, String voteId) =>
      _live(
        () => [
          for (final e in (_ballots[voteId] ?? const {}).entries)
            Doc(e.key, e.value),
        ],
      );

  @override
  Future<void> addBuilding(String orgId, String name) async {
    calls.add('building:$name');
    _b.add(Doc(_id('b'), name));
    _touch();
  }

  @override
  Future<void> addMember(String orgId, String bid, BMember m) async {
    calls.add('member:${m.shareBp}');
    _m.add(Doc(_id('m'), m));
    _touch();
  }

  @override
  Future<void> addExpense(
    String orgId,
    String bid,
    String title,
    double amount,
    String date,
    PickedFile receipt,
  ) async {
    calls.add('expense:$amount');
    _e.add(
      Doc(
        _id('e'),
        BExpense(title, amount, date, 'orgs/$orgId/receipts/${receipt.name}'),
      ),
    );
    _touch();
  }

  @override
  Future<void> addContribution(
    String orgId,
    String bid,
    BContribution c,
  ) async {
    calls.add('contribution:${c.amount}');
    _c.add(Doc(_id('c'), c));
    _touch();
  }

  @override
  Future<void> addQuote(String orgId, String bid, BQuote q) async {
    calls.add('quote:${q.vendor}');
    _q.add(Doc(_id('q'), q));
    _touch();
  }

  @override
  Future<void> addVote(
    String orgId,
    String bid,
    String title,
    String rule,
  ) async {
    calls.add('vote:$rule');
    _v.add(Doc(_id('v'), BVote(title, rule, false)));
    _touch();
  }

  @override
  Future<void> castBallot(
    String orgId,
    String bid,
    String voteId,
    String memberId,
    String choice,
  ) async {
    final map = _ballots[voteId] ??= {};
    if (map.containsKey(memberId)) throw StateError('one ballot per unit');
    map[memberId] = choice;
    calls.add('ballot:$choice');
    _touch();
  }

  @override
  Future<void> closeVote(String orgId, String bid, String voteId) async {
    final i = _v.indexWhere((x) => x.id == voteId);
    _v[i] = Doc(voteId, BVote(_v[i].data.title, _v[i].data.rule, true));
    _touch();
  }
}

class FakePhotoPicker implements PhotoPicker {
  PickedFile? next = PickedFile(
    Uint8List.fromList([1, 2, 3]),
    'r.jpg',
    'image/jpeg',
  );

  @override
  Future<PickedFile?> pick() async => next;
}
