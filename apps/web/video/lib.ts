import { mkdirSync } from 'node:fs';
import { type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

/** Where scene videos and the screenshots used by the project PDF are written (relative to apps/web). */
export const SCENES = '../../docs/video/scenes';
export const SHOTS = '../../docs/screenshots/tour';
mkdirSync(SCENES, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const GEO = {
  geolocation: { latitude: 24.7136, longitude: 46.6753 },
  permissions: ['geolocation'],
};

/** Re-creates the caption bar after every navigation, from sessionStorage. */
const CAPTION_SCRIPT = `
(() => {
  const draw = () => {
    const text = sessionStorage.getItem('__cap') || '';
    let el = document.getElementById('__cap');
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147483647;' +
        'max-width:78%;padding:12px 24px;border-radius:14px;background:rgba(14,13,11,.88);color:#F4EEE4;' +
        'border:1px solid rgba(217,130,90,.65);font:600 22px/1.6 "IBM Plex Sans Arabic",Tahoma,sans-serif;' +
        'direction:rtl;text-align:center;pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,.35)';
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = text;
  };
  window.addEventListener('DOMContentLoaded', draw);
  new MutationObserver(draw).observe(document.documentElement, { childList: true });
  draw();
})();
`;

export interface Scene {
  ctx: BrowserContext;
  page: Page;
  /** Closes the context and saves the video as `NN-name.webm`. */
  finish: () => Promise<void>;
}

/** A recorded browser context (1280x720) with the caption bar installed. */
export async function record(browser: Browser, file: string, geo = false): Promise<Scene> {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: `${SCENES}/_raw`, size: { width: 1280, height: 720 } },
    ...(geo ? GEO : {}),
  });
  await ctx.addInitScript(CAPTION_SCRIPT);
  // Automated browsers get the flat schematic by default; the tour must show the real 3D map.
  await ctx.addInitScript(() => {
    (window as unknown as { __RK_FORCE_MAP: boolean }).__RK_FORCE_MAP = true;
  });
  const page = await ctx.newPage();
  return {
    ctx,
    page,
    finish: async () => {
      const video = page.video();
      await ctx.close();
      await video?.saveAs(`${SCENES}/${file}.webm`);
    },
  };
}

export const beat = (page: Page, ms = 1600) => page.waitForTimeout(ms);

/** Shows a caption (Arabic) and holds for `ms`. Pass '' to clear it. */
export async function say(page: Page, text: string, ms = 2200) {
  await page.evaluate((t) => {
    if (t) sessionStorage.setItem('__cap', t);
    else sessionStorage.removeItem('__cap');
    const el = document.getElementById('__cap');
    if (!t && el) el.remove();
    if (t && el) el.textContent = t;
    if (t && !el) window.dispatchEvent(new Event('DOMContentLoaded'));
  }, text);
  if (ms) await page.waitForTimeout(ms);
}

/** A full-screen title card in the brand colors. */
export async function title(page: Page, heading: string, sub: string, ms = 3600) {
  await page.evaluate(
    ([h, s]) => {
      const d = document.createElement('div');
      d.id = '__title';
      d.style.cssText =
        'position:fixed;inset:0;z-index:2147483646;background:#0E0D0B;color:#F4EEE4;display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;gap:18px;direction:rtl;' +
        'font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;text-align:center';
      d.innerHTML =
        '<svg width="84" height="84" viewBox="0 0 32 32" fill="#D9825A"><path d="M16 2 22 10H10z"/>' +
        '<path d="M16 11.5 25 21H7z"/><path d="M16 22.5 28 30H4z"/></svg>' +
        `<div style="font:700 54px/1.3 'Reem Kufi',Tahoma,sans-serif">${h}</div>` +
        `<div style="font:500 26px/1.7 'IBM Plex Sans Arabic',Tahoma,sans-serif;color:#D9825A;max-width:70%">${s}</div>`;
      document.body.appendChild(d);
    },
    [heading, sub],
  );
  await page.waitForTimeout(ms);
  await page.evaluate(() => document.getElementById('__title')?.remove());
  await page.waitForTimeout(300);
}

/** Types into a field character by character so the viewer can follow. */
export async function typeInto(field: Locator, text: string, delay = 55) {
  await field.click();
  await field.pressSequentially(text, { delay });
}

export async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Slow, smooth scroll down the page (for the landing tour). */
export async function scrollTour(page: Page, steps: number, px = 520, ms = 900) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, px);
    await page.waitForTimeout(ms);
  }
}
