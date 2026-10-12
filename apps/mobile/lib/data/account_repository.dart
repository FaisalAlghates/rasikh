import 'dart:convert';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:share_plus/share_plus.dart';

enum AccountFailure { transferOwnershipFirst, recentLoginRequired, generic }

class AccountException implements Exception {
  const AccountException(this.failure);
  final AccountFailure failure;
}

/// Saudi PDPL rights: everything held about me, and deleting my account.
abstract class AccountRepository {
  /// All data tied to the signed-in person, as pretty-printed JSON.
  Future<String> exportMyData();

  /// Needs a sign-in from the last five minutes (re-authenticate first).
  Future<void> deleteMyAccount();
}

class FunctionsAccountRepository implements AccountRepository {
  FunctionsAccountRepository({FirebaseFunctions? functions})
    : _functions =
          functions ?? FirebaseFunctions.instanceFor(region: 'me-central2');
  final FirebaseFunctions _functions;

  AccountException _map(FirebaseFunctionsException e) {
    final msg = e.message ?? '';
    return AccountException(
      msg.contains('transfer_ownership_first')
          ? AccountFailure.transferOwnershipFirst
          : msg.contains('recent_login_required')
          ? AccountFailure.recentLoginRequired
          : AccountFailure.generic,
    );
  }

  @override
  Future<String> exportMyData() async {
    try {
      final res = await _functions.httpsCallable('exportMyData').call();
      return const JsonEncoder.withIndent('  ').convert(res.data);
    } on FirebaseFunctionsException catch (e) {
      throw _map(e);
    }
  }

  @override
  Future<void> deleteMyAccount() async {
    try {
      await _functions.httpsCallable('deleteMyAccount').call();
    } on FirebaseFunctionsException catch (e) {
      throw _map(e);
    }
  }
}

/// Hands the export file to the phone's share sheet (save to Files, send to yourself): no server involved.
abstract class DataFileSharer {
  Future<void> share({required String fileName, required String json});
}

class ShareDataFileSharer implements DataFileSharer {
  const ShareDataFileSharer();

  @override
  Future<void> share({required String fileName, required String json}) =>
      SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(
              utf8.encode(json),
              mimeType: 'application/json',
              name: fileName,
            ),
          ],
          fileNameOverrides: [fileName],
        ),
      );
}
