import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// No Mapbox token in CI, so these exercise the flat schematic that shares the map's data and selection.
test.describe('portfolio map ↔ list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ar/portfolio');
    await page.waitForLoadState('networkidle');
  });

  test('is labelled as sample data and lists the properties', async ({ page }) => {
    await expect(page.getByText('بيانات تجريبية')).toBeVisible();
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(6);
    await expect(page.getByTestId('flat-map')).toBeVisible();
  });

  test('selecting in the list opens the peek card; selecting on the map syncs the list', async ({
    page,
  }) => {
    await page.getByTestId('row-p3').click();
    const card = page.getByTestId('peek-card');
    await expect(card).toContainText('برج النخيل');
    await expect(card).toContainText('1,104,000');
    await page.getByRole('button', { name: 'عمارة الياسمين' }).last().click(); // marker on the flat map
    await expect(card).toContainText('عمارة الياسمين');
    await expect(page.getByTestId('row-p1')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'إغلاق البطاقة' }).click();
    await expect(card).toHaveCount(0);
  });

  test('search and progressive filters narrow both list and map', async ({ page }) => {
    await page.getByRole('searchbox').fill('الياسمين');
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(1);
    await page.getByRole('searchbox').fill('');
    await expect(page.getByRole('group', { name: 'تصفية' })).toHaveCount(0); // filters start collapsed
    await page.getByRole('button', { name: 'تصفية' }).click();
    await page.getByRole('group', { name: 'تصفية' }).getByRole('button', { name: 'متأخر' }).click();
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(1);
    await expect(page.getByTestId('row-p4')).toBeVisible();
  });

  test('exactly one glass layer on the screen', async ({ page }) => {
    await page.getByTestId('row-p2').click();
    await expect(page.locator('.glass')).toHaveCount(1);
  });

  test('axe: no WCAG A/AA violations', async ({ page }) => {
    await page.getByTestId('row-p2').click();
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  });
});
