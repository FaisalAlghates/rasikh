// Usage: node scripts/screenshots.mjs <label>   → docs/screenshots/phase2/<label>/*.png
// Needs the dev server on :3000 (and emulators for pages that touch auth).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'run';
const out = join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots', 'phase2', label);
mkdirSync(out, { recursive: true });

const shots = [
  { name: 'landing-ar-desktop', path: '/ar', w: 1440, h: 900 },
  { name: 'landing-ar-mobile', path: '/ar', w: 390, h: 844 },
  { name: 'landing-en-mobile', path: '/en', w: 390, h: 844 },
  { name: 'lab-ar-desktop', path: '/ar/design-lab', w: 1440, h: 900 },
  { name: 'lab-ar-mobile', path: '/ar/design-lab', w: 390, h: 844 },
  { name: 'lab-en-desktop', path: '/en/design-lab', w: 1440, h: 900 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 1,
    isMobile: s.w < 600,
  });
  const page = await ctx.newPage();
  const base = process.env.BASE_URL ?? 'http://localhost:3000';
  await page.goto(`${base}${s.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900); // let entrance animations settle
  await page.screenshot({ path: join(out, `${s.name}.png`), fullPage: true });
  console.log('saved', s.name);
  await ctx.close();
}
await browser.close();
