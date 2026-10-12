'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS !== 'false';

// With emulators on, a demo config is enough (no console project needed).
const config = useEmulators
  ? {
      apiKey: 'demo-key',
      authDomain: 'demo-rasikh.firebaseapp.com',
      projectId: 'demo-rasikh',
      storageBucket: 'demo-rasikh.appspot.com',
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

export const FUNCTIONS_REGION = 'me-central2';

let emulatorsConnected = false;

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

/** Connects every service to the emulators once, before any of them is used. */
function connectEmulators() {
  if (!useEmulators || emulatorsConnected) return;
  emulatorsConnected = true;
  const app = firebaseApp();
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  auth.settings.appVerificationDisabledForTesting = true;
  connectFunctionsEmulator(getFunctions(app, FUNCTIONS_REGION), '127.0.0.1', 5001);
  connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
  connectStorageEmulator(getStorage(app), '127.0.0.1', 9199);
}

export function firebaseAuth() {
  connectEmulators();
  return getAuth(firebaseApp());
}

export function firebaseFunctions() {
  connectEmulators();
  return getFunctions(firebaseApp(), FUNCTIONS_REGION);
}

export function firebaseDb() {
  connectEmulators();
  return getFirestore(firebaseApp());
}

export function firebaseStorage() {
  connectEmulators();
  return getStorage(firebaseApp());
}
