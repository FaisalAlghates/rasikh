import 'package:rasikh/data/account_repository.dart';

class FakeAccountRepository implements AccountRepository {
  AccountFailure? failDeleteWith;
  final calls = <String>[];

  @override
  Future<String> exportMyData() async {
    calls.add('export');
    return '{"uid":"u1"}';
  }

  @override
  Future<void> deleteMyAccount() async {
    calls.add('delete');
    if (failDeleteWith != null) throw AccountException(failDeleteWith!);
  }
}

class FakeDataFileSharer implements DataFileSharer {
  final shared = <({String fileName, String json})>[];

  @override
  Future<void> share({required String fileName, required String json}) async {
    shared.add((fileName: fileName, json: json));
  }
}
