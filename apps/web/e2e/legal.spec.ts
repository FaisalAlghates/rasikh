import { expect, test } from '@playwright/test';

for (const [path, title] of [
  ['privacy', 'سياسة الخصوصية'],
  ['terms', 'الشروط والأحكام'],
  ['disclaimers', 'إخلاء المسؤولية'],
] as const) {
  test(`legal: ${path} page is in Arabic, says it is a draft and is linked from the landing footer`, async ({
    page,
  }) => {
    await page.goto('/ar');
    const link = page
      .getByRole('navigation', { name: 'سياسة الخصوصية' })
      .getByRole('link', { name: title });
    await expect(link).toHaveAttribute('href', `/ar/${path}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/ar/${path}$`), { timeout: 45_000 }); // first visit compiles in dev
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByTestId('legal-draft')).toContainText('المراجعة القانونية');
    expect(await page.getByRole('heading', { level: 2 }).count()).toBeGreaterThan(3);
  });
}

test('legal: the privacy page names the Saudi data law and in-Kingdom storage', async ({
  page,
}) => {
  await page.goto('/ar/privacy');
  await expect(page.locator('main')).toContainText('نظام حماية البيانات الشخصية');
  await expect(page.locator('main')).toContainText('داخل المملكة');
  await page.goto('/en/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy');
});
