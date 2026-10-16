import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SECTIONS = [
  { key: 'property', title: 'إدارة الأملاك' },
  { key: 'office', title: 'المكتب الهندسي الذكي' },
  { key: 'broker', title: 'الوساطة العقارية' },
] as const;

for (const { key, title } of SECTIONS) {
  test(`section page: ${key} has its own video, steps and a free start`, async ({ page }) => {
    await page.goto(`/ar/sections/${key}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByText('مجاني الآن').first()).toBeVisible();
    await expect(page.getByTestId('section-video').locator('source')).toHaveAttribute(
      'src',
      `/videos/${key}.webm`,
    );
    await expect(page.getByTestId('section-steps').locator('li')).toHaveCount(6);
    // the other two sections are offered, never mixed in
    await expect(
      page.getByRole('navigation', { name: 'الأقسام الأخرى' }).getByRole('link'),
    ).toHaveCount(2);
    await page.locator(`[data-start="${key}"]`).click();
    await expect(page).toHaveURL(/\/ar\/auth/, { timeout: 30_000 });
    expect(await page.evaluate(() => localStorage.getItem('rk-section'))).toBe(key);
  });
}

test('the office page also explains the drawings and how they print', async ({ page }) => {
  await page.goto('/ar/sections/office');
  await expect(page.getByTestId('drawings-video').locator('source')).toHaveAttribute(
    'src',
    '/videos/drawings.webm',
  );
  await expect(page.getByTestId('print-steps').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('print-steps')).toContainText('A3');
});

test('the landing cards open the section pages', async ({ page }) => {
  await page.goto('/ar');
  await page.locator('[data-section="office"]').click();
  await expect(page).toHaveURL(/\/ar\/sections\/office/, { timeout: 30_000 });
});

test('the videos are served', async ({ request }) => {
  for (const key of [...SECTIONS.map((s) => s.key), 'drawings']) {
    const res = await request.get(`/videos/${key}.webm`, { headers: { Range: 'bytes=0-99' } });
    expect([200, 206]).toContain(res.status());
  }
});

for (const path of ['/ar/sections/property', '/en/sections/office']) {
  test(`axe: no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
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
