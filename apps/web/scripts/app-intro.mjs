// Usage: node scripts/app-intro.mjs <label> → docs/screenshots/immersive/<label>/app-intro-*.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'run';
const base = process.env.APP_URL ?? 'http://127.0.0.1:8090';
const out = join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots', 'immersive', label);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const hide = () =>
  page.evaluate(() =>
    document.querySelectorAll('body *').forEach((e) => {
      if (e.children.length === 0 && /emulator mode/i.test(e.textContent || '')) e.remove();
    }),
  );
const shot = async (name, wait = 1500) => {
  await page.waitForTimeout(wait);
  await hide();
  await page.screenshot({ path: join(out, `app-${name}.png`) });
  console.log('saved', name);
};

await page.goto(base, { waitUntil: 'load' });
await page.waitForTimeout(9000);
await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.click());
await page.waitForTimeout(800);
await shot('intro-1', 800);
await page.getByRole('button', { name: 'التالي' }).click();
await shot('intro-2', 1800);
await page.getByRole('button', { name: 'التالي' }).click();
await shot('intro-3', 1800);
await page.getByRole('button', { name: 'ابدأ الآن' }).click();
await shot('auth', 1800);
await browser.close();
