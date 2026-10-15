// Grants (or revokes) the Rasikh team permission to read the public contact messages and page feedback.
// It is a custom claim set with the Admin SDK, never from a browser. Existing claims (organizations) are kept.
//
// Emulators:    FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/set-platform-admin.mjs --project demo-rasikh you@example.com
// Real project: GOOGLE_APPLICATION_CREDENTIALS=<service-account.json> node scripts/set-platform-admin.mjs --project rasikh-eca19 you@example.com
// Add --revoke to remove it. The person signs out and in again (or reloads) to pick up the change.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const pi = args.indexOf('--project');
const projectId = pi >= 0 ? args[pi + 1] : undefined;
const email = args.find((a, i) => !a.startsWith('--') && i !== pi + 1);
if (!projectId || !email) {
  console.error('usage: node scripts/set-platform-admin.mjs --project <id> <email> [--revoke]');
  process.exit(1);
}

initializeApp({ projectId });
const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.platformAdmin;
else claims.platformAdmin = true;
await auth.setCustomUserClaims(user.uid, claims);
console.log(`${revoke ? 'revoked' : 'granted'} platform admin for ${email} on ${projectId}`);
