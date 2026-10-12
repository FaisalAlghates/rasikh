// Usage: node scripts/immersive-shots.mjs <label> [path]   → docs/screenshots/immersive/<label>/*.png
// Scrolls through the landing page in a real (SwiftShader WebGL) browser and logs shader/console errors.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'run';
const path = process.argv[3] ?? '/ar';
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const out = join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots', 'immersive', label);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});
const sizes = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];
for (const s of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 1,
    isMobile: s.mobile,
    hasTouch: s.mobile,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__RK_NO_DEGRADE = true; // software WebGL is slow; keep the scene on for the screenshots
    window.__RK_FORCE_SCENE = true;
  });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || /shader|webgl|three/i.test(m.text()))
      problems.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 300)}`));
  await page.goto(`${base}${path}`, { waitUntil: 'load' });
  await page.mouse.move(s.width * 0.4, s.height * 0.5); // first real input starts the scene
  await page.mouse.move(s.width * 0.45, s.height * 0.5);
  await page.waitForTimeout(14000); // boot (dev server compiles three on demand) + intro dolly
  const ready = await page.evaluate(() => document.documentElement.dataset.scene ?? 'none');
  console.log(`[${s.name}] scene state: ${ready}`);

  const stops = await page.evaluate(() =>
    [...document.querySelectorAll('[data-scene-stop], section')].map((e) =>
      Math.round(e.getBoundingClientRect().top + scrollY),
    ),
  );
  const uniq = [...new Set(stops)].sort((a, b) => a - b);
  let i = 0;
  for (const y of uniq) {
    await page.evaluate((yy) => scrollTo({ top: yy + 40, behavior: 'instant' }), y);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: join(out, `${s.name}-${String(i).padStart(2, '0')}.png`) });
    i++;
  }
  // pinned section: step through it
  const pin = await page.evaluate(() => {
    const el = document.querySelector('[data-pin]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, h: r.height };
  });
  if (pin) {
    for (const f of [0.1, 0.5, 0.9]) {
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: 'instant' }),
        pin.top + (pin.h - s.height) * f,
      );
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(out, `${s.name}-how-${f}.png`) });
    }
  }
  console.log(
    `[${s.name}] screenshots: ${i}${pin ? ' + 3 pinned' : ''}; final scene state: ${await page.evaluate(() => document.documentElement.dataset.scene ?? 'none')}`,
  );
  if (problems.length)
    console.log(`[${s.name}] problems:\n  ` + [...new Set(problems)].slice(0, 12).join('\n  '));
  await ctx.close();
}
await browser.close();
