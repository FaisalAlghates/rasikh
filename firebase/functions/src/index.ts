import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { aiAssist as aiAssistImpl } from './ai/assist.js';
import { importIndicativePrices as importIndicativePricesImpl } from './ai/prices.js';
import { providerFromEnv } from './ai/provider.js';
import { createRuntime, type Runtime } from './ai/runtime.js';
import { signInspection as signInspectionImpl } from './inspections.js';
import { inviteBuildingMember as inviteBuildingMemberImpl } from './links.js';
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

export const inviteBuildingMember = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  inviteBuildingMemberImpl(deps(), req.auth?.uid, req.data),
);

export const createTicket = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  createTicketImpl({ db: getFirestore() }, req.auth?.uid, req.data),
);

export const ticketAction = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  ticketActionImpl({ db: getFirestore(), auth: getAuth() }, req.auth?.uid, req.data),
);

// AI runs only here, server-side (CLAUDE.md §7). The provider comes from AI_PROVIDER (default: the cost-free fake).
let runtime: Runtime | undefined;
const aiRuntime = () => (runtime ??= createRuntime(providerFromEnv()));

export const aiAssist = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) =>
  aiAssistImpl({ db: getFirestore(), runtime: aiRuntime() }, req.auth?.uid, req.data),
);

export const importIndicativePrices = onCall({ enforceAppCheck }, (req: CallableRequest<unknown>) => {
  const data = (req.data ?? {}) as { orgId?: unknown; payload?: unknown };
  return importIndicativePricesImpl({ db: getFirestore() }, req.auth?.uid, data.orgId, data.payload);
});

/** 07:00 Riyadh time every day. */
export const dailyReminders = onSchedule(
  { schedule: '0 7 * * *', timeZone: 'Asia/Riyadh' },
  async () => {
    const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
    await runReminders({ db: getFirestore(), messaging: getMessaging() }, today);
  },
);
