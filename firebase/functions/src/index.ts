import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createOrganization as createOrganizationImpl } from './organizations.js';
import { runReminders } from './reminders.js';
import { claimInvites as claimInvitesImpl, inviteTenant as inviteTenantImpl } from './tenants.js';

// All data and compute stay in Dammam (CLAUDE.md §2).
setGlobalOptions({ region: 'me-central2', maxInstances: 10 });

if (getApps().length === 0) initializeApp();

const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';
const deps = () => ({ db: getFirestore(), auth: getAuth() });

export const createOrganization = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  createOrganizationImpl(deps(), req.auth?.uid, req.data),
);

export const inviteTenant = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  inviteTenantImpl(deps(), req.auth?.uid, req.data),
);

export const claimInvites = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  claimInvitesImpl(deps(), req.auth?.uid),
);

/** 07:00 Riyadh time every day. */
export const dailyReminders = onSchedule(
  { schedule: '0 7 * * *', timeZone: 'Asia/Riyadh' },
  async () => {
    const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
    await runReminders({ db: getFirestore(), messaging: getMessaging() }, today);
  },
);
