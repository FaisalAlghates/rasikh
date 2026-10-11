import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { createOrganization as createOrganizationImpl } from './organizations.js';

// All data and compute stay in Dammam (CLAUDE.md §2).
setGlobalOptions({ region: 'me-central2', maxInstances: 10 });

if (getApps().length === 0) initializeApp();

export const createOrganization = onCall(
  { enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' },
  (req: CallableRequest<unknown>) =>
    createOrganizationImpl({ db: getFirestore(), auth: getAuth() }, req.auth?.uid, req.data),
);
