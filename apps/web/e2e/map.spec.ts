import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { onboardOwner } from './helpers';

// Automated browsers get the flat schematic, which shares the 3D map's data, cities and selection.
test.describe('Kingdom map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ar/map', { timeout: 60_000 });
    await expect(page.getByTestId('flat-map')).toBeVisible({ timeout: 30_000 });
  });

  test('opens on the whole Kingdom, with sample properties across many cities', async ({
    page,
  }) => {
    await expect(page.getByText('بيانات تجريبية')).toBeVisible();
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(12);
    await expect(page.getByTestId('city-kingdom')).toHaveAttribute('aria-pressed', 'true');
    // city pins across the Kingdom (cities sitting on top of each other keep one button; all are in the list)
    const map = page.getByTestId('flat-map');
    for (const city of ['الرياض', 'مكة المكرمة', 'الدمام', 'أبها', 'تبوك', 'عرعر']) {
      await expect(
        map.getByRole('button', { name: new RegExp(`^اذهب إلى ${city}`) }),
      ).toBeVisible();
    }
  });

  test('choosing a city flies into it and narrows the list; the Kingdom button returns', async ({
    page,
  }) => {
    await page
      .getByTestId('flat-map')
      .getByRole('button', { name: /^اذهب إلى تبوك/ })
      .click();
    await expect(page.getByTestId('city-tabuk')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(1);
    await expect(page.getByTestId('row-p10')).toContainText('عمارة المروج');
    // every city, even one without its own pin, is in the city list
    await page.getByTestId('city-jeddah').click();
    await expect(page.getByTestId('row-p5')).toContainText('عمارة الحمراء');
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(1);
    await expect(page.getByTestId('city-kingdom')).toHaveText('المملكة كاملة');
    await page.getByRole('button', { name: 'المملكة كاملة' }).first().click();
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(12);
  });

  test('selecting in the list opens its city and the peek card; the map selection syncs back', async ({
    page,
  }) => {
    await page.getByTestId('row-p3').click();
    const card = page.getByTestId('peek-card');
    await expect(card).toContainText('برج النخيل');
    await expect(card).toContainText('1,104,000');
    await expect(page.getByTestId('city-riyadh')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('flat-map').getByRole('button', { name: 'عمارة الياسمين' }).click();
    await expect(card).toContainText('عمارة الياسمين');
    await expect(page.getByTestId('row-p1')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'إغلاق البطاقة' }).click();
    await expect(card).toHaveCount(0);
  });

  test('search and progressive filters narrow both list and map', async ({ page }) => {
    await page.getByRole('searchbox').fill('الياسمين');
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(1);
    await page.getByRole('searchbox').fill('تبوك'); // a city name finds its properties
    await expect(page.getByTestId('row-p10')).toBeVisible();
    await page.getByRole('searchbox').fill('');
    await expect(page.getByRole('group', { name: 'تصفية' })).toHaveCount(0); // filters start collapsed
    await page.getByRole('button', { name: 'تصفية' }).click();
    await page.getByRole('group', { name: 'تصفية' }).getByRole('button', { name: 'متأخر' }).click();
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(1);
    await expect(page.getByTestId('row-p4')).toBeVisible();
  });

  test('a deep link opens a city', async ({ page }) => {
    await page.goto('/ar/map?city=khobar');
    await expect(page.getByTestId('city-khobar')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('row-p6')).toBeVisible();
  });

  test('the old portfolio address redirects here', async ({ page }) => {
    await page.goto('/ar/portfolio');
    await expect(page).toHaveURL(/\/ar\/map$/);
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

test('an owner sees their own properties on the Kingdom map and pins one exactly', async ({
  browser,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(180_000);
  // the phone's location is used once, while "standing" at the first property in Jeddah
  const ctx = await browser.newContext({
    geolocation: { latitude: 21.5433, longitude: 39.1728 },
    permissions: ['geolocation'],
  });
  const page = await ctx.newPage();
  await onboardOwner(page, `map-owner-${Date.now()}@rasikh.test`);
  await page.getByRole('tab', { name: 'العقارات والوحدات' }).click();

  // 1) Jeddah, with the exact spot from the phone
  await page.getByLabel('الاسم', { exact: true }).fill('برج الحمراء');
  await page.getByLabel('المدينة').selectOption('jeddah');
  await page.getByRole('button', { name: 'استخدم موقعي الحالي' }).click();
  await expect(page.getByTestId('new-property-location')).toContainText('21.5433');
  await page.getByRole('button', { name: 'أضف عقاراً' }).click();
  const first = page.getByTestId('property-برج الحمراء');
  await expect(first).toContainText('موقع دقيق');

  // 2) Jeddah again, no exact spot yet
  await page.getByLabel('الاسم', { exact: true }).fill('عمارة الروضة');
  await page.getByLabel('المدينة').selectOption('jeddah');
  await page.getByRole('button', { name: 'أضف عقاراً' }).click();
  const second = page.getByTestId('property-عمارة الروضة');
  await expect(second).toContainText('موقع تقريبي حسب المدينة');

  // the card leads to the map, which shows this owner's properties (not the samples)
  await second.getByRole('link', { name: 'اعرضه على الخريطة' }).click();
  await expect(page).toHaveURL(/\/ar\/map\?property=/, { timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'عقاراتي' })).toHaveAttribute(
    'aria-pressed',
    'true',
    {
      timeout: 30_000,
    },
  );
  await expect(page.locator('[data-testid^="row-"]')).toHaveCount(2);
  await expect(page.getByTestId('city-jeddah')).toHaveAttribute('aria-pressed', 'true');
  const card = page.getByTestId('peek-card');
  await expect(card).toContainText('عمارة الروضة');
  await expect(card).toContainText('الموقع تقريبي حسب المدينة');

  // pin it by clicking on the map
  await card.getByTestId('set-pin').click();
  await expect(page.getByTestId('placing-hint')).toContainText('عمارة الروضة');
  await page.getByTestId('place-surface').click();
  await expect(card).toContainText('حُفظ الموقع الدقيق', { timeout: 20_000 });
  await expect(card).toContainText('موقع دقيق');
  await expect(card.getByTestId('set-pin')).toHaveText('انقل الموقع');
  await ctx.close();
});
