import { mkdirSync, writeFileSync } from 'node:fs';
import { devices, type Browser, type BrowserContext, type Page } from '@playwright/test';

/** Raw recordings for the split-screen film (relative to apps/web). Git-ignored with docs/video. */
export const FILM = '../../docs/video/film';
mkdirSync(FILM, { recursive: true });

export type Form = 'desktop' | 'mobile';

const GEO = {
  geolocation: { latitude: 24.7136, longitude: 46.6753 },
  permissions: ['geolocation'],
};
const MOBILE = devices['Pixel 7']; // 412 x 915, touch, mobile user agent

export interface Mark {
  caption: string;
  /** Seconds from the start of this recording. */
  t: number;
}

/**
 * One recorded pass of a scene (desktop or mobile). Each `step()` stamps the time so the compositor can play the
 * desktop and mobile videos side by side, step by step, and show the caption under both.
 */
export class Track {
  readonly marks: Mark[] = [];
  private t0 = 0;
  constructor(
    readonly ctx: BrowserContext,
    readonly page: Page,
    readonly scene: string,
    readonly form: Form,
  ) {
    this.t0 = Date.now();
  }

  /** Starts a new step: everything until the next step is shown with this caption. */
  async step(caption: string, hold = 0) {
    this.marks.push({ caption, t: (Date.now() - this.t0) / 1000 });
    if (hold) await this.page.waitForTimeout(hold);
  }

  beat(ms = 1400) {
    return this.page.waitForTimeout(ms);
  }

  async scroll(px: number, ms = 700) {
    await this.page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), px);
    await this.page.waitForTimeout(ms);
  }

  async finish() {
    await this.page.waitForTimeout(900);
    this.marks.push({ caption: '', t: (Date.now() - this.t0) / 1000 });
    const video = this.page.video();
    await this.ctx.close();
    await video?.saveAs(`${FILM}/${this.scene}-${this.form}.webm`);
    writeFileSync(
      `${FILM}/${this.scene}-${this.form}.json`,
      JSON.stringify({ scene: this.scene, form: this.form, marks: this.marks }, null, 2),
    );
  }
}

export async function openTrack(browser: Browser, scene: string, form: Form, geo = false) {
  const size = form === 'desktop' ? { width: 1280, height: 720 } : MOBILE.viewport;
  const ctx = await browser.newContext({
    ...(form === 'mobile' ? MOBILE : {}),
    viewport: size,
    recordVideo: { dir: `${FILM}/_raw`, size },
    ...(geo ? GEO : {}),
  });
  // The film shows the real 3D map (automated browsers get the flat schematic by default), and hides the
  // dev-server badge, which is not part of the product.
  await ctx.addInitScript(() => {
    (window as unknown as { __RK_FORCE_MAP: boolean }).__RK_FORCE_MAP = true;
    const hide = () => {
      const st = document.createElement('style');
      st.textContent = 'nextjs-portal{display:none!important}';
      document.head.appendChild(st);
    };
    if (document.head) hide();
    else document.addEventListener('DOMContentLoaded', hide);
  });
  const page = await ctx.newPage();
  return new Track(ctx, page, scene, form);
}
