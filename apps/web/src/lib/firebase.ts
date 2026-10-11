'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS !== 'false';

// With emulators on, a demo config is enough (no console project needed).
const config = useEmulators
  ? { apiKey: 'demo-key', authDomain: 'demo-rasikh.firebaseapp.com', projectId: 'demo-rasikh' }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

export const FUNCTIONS_REGION = 'me-central2';

let emulatorsConnected = false;

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

export function firebaseAuth() {
  const auth = getAuth(firebaseApp());
  if (useEmulators && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    auth.settings.appVerificationDisabledForTesting = true;
    connectFunctionsEmulator(firebaseFunctions(), '127.0.0.1', 5001);
    emulatorsConnected = true;
  }
  return auth;
}

export function firebaseFunctions() {
  return getFunctions(firebaseApp(), FUNCTIONS_REGION);
}
