import { type Browser, type BrowserContext, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';

/** Shared by the video recorders: the caption overlay, a recording context, and the pacing helpers. */
export const OUT = 'public/videos';
export const SIZE = { width: 1280, height: 720 };
export const isoIn = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export const CAPTION_SCRIPT = `
(() => {
  const draw = () => {
    const t = sessionStorage.getItem('__cap');
    let el = document.getElementById('__cap');
    if (!t) { el && el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:28px;margin:0 auto;width:fit-content;max-width:78%;' +
        'background:rgba(14,13,11,.9);color:#F4EEE4;font:600 24px/1.7 "IBM Plex Sans Arabic",system-ui,sans-serif;' +
        'padding:12px 26px;border-radius:14px;z-index:2147483647;text-align:center;direction:rtl;pointer-events:none';
      document.documentElement.append(el);
    }
    el.textContent = t;
  };
  window.__drawCap = draw;
  document.addEventListener('DOMContentLoaded', draw);
  setInterval(draw, 400);
})();
`;

export async function recorder(
  browser: Browser,
  name: string,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: `test-results/videos/${name}`, size: SIZE },
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:3000', localStorage: [{ name: 'rk-cookie-ok', value: '1' }] },
      ],
    },
  });
  await ctx.addInitScript(CAPTION_SCRIPT);
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept());
  return { ctx, page };
}

export async function plain(browser: Browser) {
  const ctx = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:3000', localStorage: [{ name: 'rk-cookie-ok', value: '1' }] },
      ],
    },
  });
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept());
  return { ctx, page };
}

/** Shows a caption, holds it long enough to read. */
export async function say(p: Page, text: string, hold = 2600) {
  await p.evaluate((t) => {
    sessionStorage.setItem('__cap', t);
    (window as unknown as { __drawCap?: () => void }).__drawCap?.();
  }, text);
  await p.waitForTimeout(hold);
}

export async function finish(name: string, ctx: BrowserContext, page: Page) {
  await say(page, 'راسخ · عقارك على أرض ثابتة', 2500);
  const video = page.video();
  await ctx.close();
  mkdirSync(OUT, { recursive: true });
  copyFileSync(await video!.path(), `${OUT}/${name}.webm`);
}

/** Visits each route once, unrecorded, so the dev server has compiled them before the camera rolls. */
export async function warm(browser: Browser) {
  const { ctx, page } = await plain(browser);
  for (const path of [
    '/ar',
    '/ar/auth',
    '/ar/onboarding',
    '/ar/workspace',
    '/ar/map',
    '/ar/design',
    '/ar/admin',
  ])
    await page.goto(path, { waitUntil: 'load' }).catch(() => undefined);
  await ctx.close();
}
