// Drives the Flutter web build through the whole signed-in flow against the Firebase emulators,
// using Flutter's accessibility (semantics) tree, and saves phone-width screenshots.
// Usage: node scripts/app-flow.mjs <label>   (needs emulators + `flutter run -d web-server --web-port 8090`)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'run';
const base = process.env.APP_URL ?? 'http://127.0.0.1:8090';
const out = join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots', 'phase2', label);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => {
  if (/auth error/.test(m.text())) logs.push(m.text());
});

const shot = async (name) => {
  await page.waitForTimeout(900);
  await hideBanner();
  await page.screenshot({ path: join(out, `app-${name}.png`) });
  console.log('saved', name);
};
// Flutter text fields read keystrokes, not DOM values, so click then type.
const typeInto = async (label, text) => {
  await page.getByLabel(label).first().click();
  await page.waitForTimeout(400); // let Flutter attach the editing client
  await page.keyboard.type(text, { delay: 25 });
  await page.waitForTimeout(200);
};
const enableSemantics = async () => {
  await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.click());
  await page.waitForTimeout(800);
};

// The Firebase emulator warning banner covers the bottom dock in screenshots; hide it (dev-only element).
const hideBanner = () =>
  page.evaluate(() =>
    document.querySelectorAll('body *').forEach((e) => {
      if (e.children.length === 0 && /emulator mode/i.test(e.textContent || '')) e.remove();
    }),
  );

await page.goto(`${base}/#/auth`, { waitUntil: 'load' });
await page.waitForTimeout(9000);
await enableSemantics();

// email tab → create account
await page.getByRole('button', { name: 'البريد الإلكتروني' }).first().click();
await page.getByRole('button', { name: 'ما عندك حساب؟ أنشئ حساباً' }).click();
const email = `flow-${Date.now()}@rasikh.test`;
await typeInto('البريد الإلكتروني', email);
await typeInto('كلمة المرور', 'Flow-pass-2026!');
await shot('auth-email');
await page.getByRole('button', { name: 'إنشاء حساب' }).click();
await page.waitForTimeout(2500);
if (logs.length) console.log('auth logs:', logs.join(' | '));
await shot('onboarding');

await page.getByRole('checkbox', { name: /^مالك/ }).click();
await typeInto('اسمك', 'فيصل');
await typeInto('اسم محفظتك أو شركتك', 'عقارات الشمال');
await page.getByRole('checkbox', { name: /أوافق/ }).click();
await shot('onboarding-filled');
await page.getByRole('button', { name: 'أنشئ مساحة العمل' }).click();
await page.waitForTimeout(3500);
await shot('shell-home');

for (const [name, tab] of [
  ['shell-map', 'الخريطة'],
  ['shell-record', 'السجل'],
  ['shell-profile', 'حسابي'],
]) {
  await page.getByRole('button', { name: tab }).click();
  await shot(name);
}
await browser.close();
