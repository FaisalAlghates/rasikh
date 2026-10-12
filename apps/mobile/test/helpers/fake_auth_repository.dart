import 'dart:async';

import 'package:rasikh/data/auth_repository.dart';

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({SessionUser? initial}) {
    _current = initial;
  }

  final _controller = StreamController<SessionUser?>.broadcast();
  SessionUser? _current;

  final calls = <String>[];
  Map<String, Object?>? lastOrgRequest;
  AuthFailure? failNextAuthWith;

  void _emit(SessionUser? u) {
    _current = u;
    _controller.add(u);
  }

  @override
  Stream<SessionUser?> sessionChanges() async* {
    yield _current;
    yield* _controller.stream;
  }

  void _maybeFail() {
    final f = failNextAuthWith;
    if (f != null) {
      failNextAuthWith = null;
      throw AuthException(f);
    }
  }

  @override
  Future<void> signInWithEmail(String email, String password) async {
    calls.add('signIn:$email');
    _maybeFail();
    _emit(SessionUser(uid: 'u1'));
  }

  @override
  Future<void> createWithEmail(String email, String password) async {
    calls.add('create:$email');
    _maybeFail();
    _emit(SessionUser(uid: 'u1'));
  }

  @override
  Future<void> startPhone(String e164) async {
    calls.add('startPhone:$e164');
    _maybeFail();
  }

  @override
  Future<void> confirmPhone(String code) async {
    calls.add('confirmPhone:$code');
    _maybeFail();
    _emit(SessionUser(uid: 'u1'));
  }

  @override
  Future<void> createOrganization({
    required String name,
    required String displayName,
    required List<String> roles,
    required String locale,
  }) async {
    lastOrgRequest = {
      'name': name,
      'displayName': displayName,
      'roles': roles,
      'locale': locale,
    };
    _emit(SessionUser(uid: 'u1', orgs: {'org1': roles}));
  }

  /// Set to make the next re-authentication fail.
  AuthFailure? failNextReauthWith;

  void _maybeFailReauth() {
    final f = failNextReauthWith;
    if (f != null) {
      failNextReauthWith = null;
      throw AuthException(f);
    }
  }

  @override
  Future<void> reauthWithPassword(String password) async {
    calls.add('reauthPassword');
    _maybeFailReauth();
  }

  @override
  Future<void> startReauthPhone() async {
    calls.add('startReauthPhone');
    _maybeFailReauth();
  }

  @override
  Future<void> confirmReauthPhone(String code) async {
    calls.add('confirmReauthPhone:$code');
    _maybeFailReauth();
  }

  @override
  Future<void> signOut() async => _emit(null);
}
