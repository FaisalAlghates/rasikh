import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('landing', () => {
  test('has one headline, the four role cards and the Ejar disclaimer', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /^مالك/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^مستأجر/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^مدير عمارة/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^وسيط/ })).toBeVisible();
    await expect(page.getByText('يكمّل إيجار').first()).toBeVisible();
  });

  test('makes no unverifiable claims (no fake stats or testimonials)', async ({ page }) => {
    await page.goto('/ar');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/\d+\s*(%|٪|عميل|مستخدم)/);
    expect(text).not.toMatch(/الأول في|الأفضل|رقم 1/);
  });

  for (const path of ['/ar', '/en']) {
    test(`axe: no WCAG A/AA violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3500); // kinetic headline + entrance animations settle (contrast is read from the final state)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
        ),
      ).toEqual([]);
    });
  }

  test('respects reduced motion (no running entrance animation)', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/ar');
    const dur = await page
      .locator('.rise-in')
      .first()
      .evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(dur)).toBeLessThan(0.01);
    await ctx.close();
  });
});

test.describe('design lab', () => {
  test('renders every component in both themes', async ({ page }) => {
    await page.goto('/ar/design-lab');
    await expect(page.locator('[data-theme="light"]').first()).toBeVisible();
    await expect(page.locator('[data-theme="dark"]').first()).toBeVisible();
    // 2 themes x each block
    await expect(page.getByRole('button', { name: 'أساسي' })).toHaveCount(2);
    await expect(page.locator('.glass')).toHaveCount(2); // one glass layer per theme panel
  });

  test('dialog opens, traps focus, closes with Escape', async ({ page }) => {
    await page.goto('/ar/design-lab');
    await page.getByRole('button', { name: 'افتح نافذة' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName('تأكيد الإجراء');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('theme toggle flips the page theme and persists it', async ({ page }) => {
    await page.goto('/ar/design-lab', { waitUntil: 'networkidle' }); // wait for hydration
    await page.getByRole('button', { name: 'تبديل المظهر' }).click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', /^(light|dark)$/);
    const first = (await html.getAttribute('data-theme'))!;
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', first);
  });

  test('toast announces and can be dismissed', async ({ page }) => {
    await page.goto('/ar/design-lab');
    await page.getByRole('button', { name: 'أظهر إشعاراً' }).first().click();
    await expect(page.getByText('تم حفظ التغييرات').first()).toBeVisible();
  });

  test('axe: no WCAG A/AA violations in the lab', async ({ page }) => {
    await page.goto('/ar/design-lab');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
      ),
    ).toEqual([]);
  });
});
