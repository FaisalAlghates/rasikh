// Usage: node scripts/app-screenshots.mjs <label>  → docs/screenshots/phase2/<label>/app-*.png
// Captures the Flutter app (served by `flutter run -d web-server --web-port 8090`) at phone width.
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
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, `app-${name}.png`) });
  console.log('saved', name);
};
const tap = async (x, y) => {
  await page.touchscreen.tap(x, y);
};

await page.goto(base, { waitUntil: 'load' });
await page.waitForTimeout(9000); // first Flutter frame + web fonts
await shot('intro-1');
await tap(195, 700); // Next
await shot('intro-2');
await tap(195, 700);
await shot('intro-3');

await page.goto(`${base}/#/gallery`);
await page.waitForTimeout(3500);
await shot('gallery-ar-dark-0');
for (let i = 1; i <= 5; i++) {
  await page.mouse.move(195, 500);
  await page.mouse.wheel(0, 640);
  await shot(`gallery-ar-dark-${i}`);
}
await browser.close();
