import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Software WebGL (CI, headless) is slow; keep the scene on instead of letting it degrade.
const keepSceneOn = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __RK_NO_DEGRADE: boolean; __RK_FORCE_SCENE: boolean };
    w.__RK_NO_DEGRADE = true;
    w.__RK_FORCE_SCENE = true;
  });

const sceneState = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.scene ?? 'none');

test.describe('immersive landing', () => {
  test('the 3D city boots after load and the poster hands over to it', async ({ page }) => {
    await keepSceneOn(page);
    await page.goto('/ar');
    await expect.poll(() => sceneState(page), { timeout: 20_000 }).toBe('on');
    await expect(page.locator('canvas.scene-canvas')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-immersive', '1');
  });

  test('the headline is real text and stays the only h1 while the scene loads', async ({
    page,
  }) => {
    await page.goto('/ar');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('من يوم الاستلام إلى يوم التسليم');
  });

  test('falls back to the illustrated dusk when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __RK_FORCE_SCENE: boolean }).__RK_FORCE_SCENE = true;
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        if (type.startsWith('webgl')) return null;
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
      } as typeof orig;
    });
    await page.goto('/ar');
    await expect.poll(() => sceneState(page), { timeout: 15_000 }).toBe('off');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('img.hero-poster')).toBeVisible();
  });

  test('reduced motion: a single still frame, no entrance animation, content visible', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await keepSceneOn(page);
    await page.goto('/ar');
    await expect.poll(() => sceneState(page), { timeout: 20_000 }).toBe('on');
    const dur = await page
      .locator('.words .w > span')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(dur).toBe('none');
    // reveal-on-scroll elements must not stay hidden
    const hidden = await page
      .locator('[data-reveal]')
      .evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity === '0').length);
    expect(hidden).toBe(0);
    await ctx.close();
  });

  test('the pinned "how it works" advances 1 → 2 → 3 as you scroll', async ({ page }) => {
    await keepSceneOn(page);
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');
    const pin = page.locator('[data-pin]');
    const box = await pin.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height, vh: innerHeight };
    });
    const seen: string[] = [];
    for (const f of [0.08, 0.5, 0.92]) {
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: 'instant' }),
        box.top + (box.h - box.vh) * f,
      );
      await expect.poll(() => pin.getAttribute('data-step')).not.toBeNull();
      await page.waitForTimeout(400);
      seen.push((await pin.getAttribute('data-step')) ?? '?');
    }
    expect(seen).toEqual(['0', '1', '2']);
  });

  test('cards tilt toward the pointer on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'tilt is for fine pointers');
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');
    const card = page.locator('.tilt').first();
    await card.scrollIntoViewIfNeeded();
    const b = (await card.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.85, b.y + b.height * 0.2);
    await expect
      .poll(() => card.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--ry')))
      .not.toBe('');
    const ry = await card.evaluate((el) =>
      parseFloat((el as HTMLElement).style.getPropertyValue('--ry')),
    );
    expect(Math.abs(ry)).toBeGreaterThan(1);
  });

  test('sign-in keeps the calm 3D backdrop behind a readable panel', async ({ page }) => {
    await keepSceneOn(page);
    await page.goto('/ar/auth');
    await expect.poll(() => sceneState(page), { timeout: 20_000 }).toBe('on');
    await expect(page.locator('main.panel')).toBeVisible();
    await expect(page.locator('.scene-scrim')).toHaveCount(1);
  });

  test('axe: no WCAG A/AA violations with the 3D scene running', async ({ page }) => {
    await keepSceneOn(page);
    await page.goto('/ar');
    await expect.poll(() => sceneState(page), { timeout: 20_000 }).toBe('on');
    await page.waitForTimeout(3500); // headline animation settles
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map((v) => `: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  });

  test('plain pages (workspace) switch the backdrop off', async ({ page }) => {
    await page.goto('/ar/design-lab');
    await expect(page.locator('canvas.scene-canvas')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-immersive', '1');
  });
});
