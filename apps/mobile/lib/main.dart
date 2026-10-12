import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';

/// Run against the Firebase Emulator Suite unless built with `--dart-define=USE_EMULATORS=false`.
const _useEmulators = bool.fromEnvironment('USE_EMULATORS', defaultValue: true);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (_useEmulators) {
    // A demo project needs no console setup. Real projects use `flutterfire configure` (see docs).
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        // Not a secret: the Android SDK rejects keys that are not 39 characters starting with "A".
        apiKey: 'AIzaSyDemoKeyForEmulatorsOnly0000000000',
        appId: '1:000000000000:web:0000000000000000000000',
        messagingSenderId: '000000000000',
        projectId: 'demo-rasikh',
        storageBucket: 'demo-rasikh.appspot.com',
      ),
    );
    // Android emulators reach the host machine at 10.0.2.2.
    final host = (!kIsWeb && defaultTargetPlatform == TargetPlatform.android)
        ? '10.0.2.2'
        : '127.0.0.1';
    await FirebaseAuth.instance.useAuthEmulator(host, 9099);
    // The emulator issues codes without a reCAPTCHA / Play Integrity round trip.
    await FirebaseAuth.instance.setSettings(
      appVerificationDisabledForTesting: true,
    );
    FirebaseFunctions.instanceFor(region: 'me-central2')
        .useFunctionsEmulator(host, 5001);
    FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);
    await FirebaseStorage.instance.useStorageEmulator(host, 9199);
  } else {
    await Firebase.initializeApp();
  }

  runApp(const ProviderScope(child: RasikhApp()));
}
