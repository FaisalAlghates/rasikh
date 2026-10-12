import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { signInspection as signInspectionImpl } from './inspections.js';
import { createTicket as createTicketImpl, ticketAction as ticketActionImpl } from './tickets.js';
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

/** Signs an inspection as the owner side or the tenant; the second signature seals it. */
export const signInspection = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  signInspectionImpl(
    {
      db: getFirestore(),
      readFile: async (path) => {
        const [buf] = await getStorage().bucket().file(path).download();
        return new Uint8Array(buf);
      },
    },
    req.auth ? { uid: req.auth.uid, authTime: req.auth.token.auth_time } : undefined,
    req.data,
  ),
);

export const createTicket = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  createTicketImpl({ db: getFirestore() }, req.auth?.uid, req.data),
);

export const ticketAction = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  ticketActionImpl({ db: getFirestore() }, req.auth?.uid, req.data),
);

/** 07:00 Riyadh time every day. */
export const dailyReminders = onSchedule(
  { schedule: '0 7 * * *', timeZone: 'Asia/Riyadh' },
  async () => {
    const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
    await runReminders({ db: getFirestore(), messaging: getMessaging() }, today);
  },
);
