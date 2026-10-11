import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// The signed-in user plus the organizations/roles from the server-set custom claims.
class SessionUser {
  const SessionUser({required this.uid, this.orgs = const {}});
  final String uid;
  final Map<String, List<String>> orgs;

  bool get hasOrg => orgs.isNotEmpty;
}

/// Typed failures so the UI can map them to translated messages (no raw strings from the backend).
enum AuthFailure {
  invalidPhone,
  invalidCode,
  invalidCredentials,
  emailInUse,
  weakPassword,
  tooManyRequests,
  generic,
}

class AuthException implements Exception {
  const AuthException(this.failure);
  final AuthFailure failure;
}

enum OrgFailure { tooManyOrgs, generic }

class OrgException implements Exception {
  const OrgException(this.failure);
  final OrgFailure failure;
}

abstract class AuthRepository {
  Stream<SessionUser?> sessionChanges();
  Future<void> signInWithEmail(String email, String password);
  Future<void> createWithEmail(String email, String password);

  /// Starts phone verification; completes when the SMS code has been sent.
  Future<void> startPhone(String e164);
  Future<void> confirmPhone(String code);

  Future<void> createOrganization({
    required String name,
    required String displayName,
    required List<String> roles,
    required String locale,
  });
  Future<void> signOut();
}

class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository({FirebaseAuth? auth, FirebaseFunctions? functions})
      : _auth = auth ?? FirebaseAuth.instance,
        _functions = functions ?? FirebaseFunctions.instanceFor(region: 'me-central2');

  final FirebaseAuth _auth;
  final FirebaseFunctions _functions;
  String? _verificationId;

  @override
  Stream<SessionUser?> sessionChanges() async* {
    await for (final user in _auth.idTokenChanges()) {
      if (user == null) {
        yield null;
        continue;
      }
      final result = await user.getIdTokenResult();
      final raw = (result.claims?['orgs'] as Map?) ?? const {};
      yield SessionUser(
        uid: user.uid,
        orgs: {
          for (final e in raw.entries)
            e.key as String: [for (final r in (e.value as List)) r as String],
        },
      );
    }
  }

  AuthException _map(FirebaseAuthException e) => AuthException(switch (e.code) {
        'invalid-verification-code' => AuthFailure.invalidCode,
        'invalid-credential' ||
        'wrong-password' ||
        'user-not-found' =>
          AuthFailure.invalidCredentials,
        'email-already-in-use' => AuthFailure.emailInUse,
        'weak-password' => AuthFailure.weakPassword,
        'too-many-requests' => AuthFailure.tooManyRequests,
        'invalid-phone-number' => AuthFailure.invalidPhone,
        _ => AuthFailure.generic,
      });

  @override
  Future<void> signInWithEmail(String email, String password) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
    } on FirebaseAuthException catch (e) {
      throw _map(e);
    }
  }

  @override
  Future<void> createWithEmail(String email, String password) async {
    try {
      await _auth.createUserWithEmailAndPassword(email: email, password: password);
    } on FirebaseAuthException catch (e) {
      throw _map(e);
    }
  }

  @override
  Future<void> startPhone(String e164) async {
    final sent = Completer<void>();
    await _auth.verifyPhoneNumber(
      phoneNumber: e164,
      verificationCompleted: (_) {},
      verificationFailed: (e) => sent.completeError(_map(e)),
      codeSent: (id, _) {
        _verificationId = id;
        if (!sent.isCompleted) sent.complete();
      },
      codeAutoRetrievalTimeout: (id) => _verificationId ??= id,
    );
    return sent.future;
  }

  @override
  Future<void> confirmPhone(String code) async {
    final id = _verificationId;
    if (id == null) throw const AuthException(AuthFailure.generic);
    try {
      await _auth.signInWithCredential(
        PhoneAuthProvider.credential(verificationId: id, smsCode: code),
      );
    } on FirebaseAuthException catch (e) {
      throw _map(e);
    }
  }

  @override
  Future<void> createOrganization({
    required String name,
    required String displayName,
    required List<String> roles,
    required String locale,
  }) async {
    try {
      await _functions.httpsCallable('createOrganization').call({
        'name': name,
        'displayName': displayName,
        'roles': roles,
        'consentPdpl': true,
        'locale': locale,
      });
      await _auth.currentUser?.getIdToken(true); // pick up the new custom claims
    } on FirebaseFunctionsException catch (e) {
      throw OrgException(
        e.code == 'resource-exhausted' ? OrgFailure.tooManyOrgs : OrgFailure.generic,
      );
    }
  }

  @override
  Future<void> signOut() => _auth.signOut();
}
