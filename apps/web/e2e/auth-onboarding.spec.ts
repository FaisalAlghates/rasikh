import { expect, test } from '@playwright/test';

test('Arabic is the default and renders RTL', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('English renders LTR', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('email sign-up → role onboarding → workspace with claims', async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@rasikh.test`;
  await page.goto('/ar/auth');
  await page.getByRole('tab').nth(1).click();
  await page.locator('form').getByRole('button').last().click(); // toggle to "create account"
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('E2e-pass-2026!');
  await page.locator('form button[type=submit]').click();

  await expect(page).toHaveURL(/\/ar\/onboarding/);
  await page.getByText('مالك', { exact: true }).click();
  await page.getByText('وسيط', { exact: true }).click();
  await page.locator('#displayName').fill('فيصل');
  await page.locator('#orgName').fill('عقارات الشمال');
  await page.locator('input[type=checkbox]').last().check();
  await page.locator('main button').last().click();

  await expect(page).toHaveURL(/\/ar\/workspace/, { timeout: 20_000 });
  const list = page.getByTestId('org-list');
  await expect(list).toContainText('مالك');
  await expect(list).toContainText('وسيط');
});

test('onboarding requires a role and consent', async ({ page }, info) => {
  const email = `e2e-guard-${info.project.name}-${Date.now()}@rasikh.test`;
  await page.goto('/ar/auth');
  await page.getByRole('tab').nth(1).click();
  await page.locator('form').getByRole('button').last().click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('E2e-pass-2026!');
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(/\/ar\/onboarding/);
  await page.locator('#displayName').fill('فيصل');
  await page.locator('#orgName').fill('عقارات الشمال');
  await page.locator('main button').last().click();
  await expect(page.locator('main [role=alert]')).toContainText('اختر دوراً');
});

test('phone OTP (+966) sign-in via the emulator', async ({ page, request }, info) => {
  // Unique Saudi mobile per project/run so repeated runs do not collide.
  const national = `5${String(Date.now()).slice(-7)}${info.project.name === 'mobile' ? '1' : '2'}`;
  await page.goto('/ar/auth');
  await page.locator('#phone').fill(national);
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('#code')).toBeVisible({ timeout: 15_000 });

  const res = await request.get(
    'http://127.0.0.1:9099/emulator/v1/projects/demo-rasikh/verificationCodes',
  );
  const { verificationCodes } = (await res.json()) as {
    verificationCodes: { phoneNumber: string; code: string }[];
  };
  const entry = verificationCodes.filter((v) => v.phoneNumber === `+966${national}`).pop();
  expect(entry, 'emulator should have issued a code').toBeTruthy();

  await page.locator('#code').fill(entry!.code);
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(/\/ar\/onboarding/, { timeout: 15_000 });
});

test('rejects non-Saudi / malformed phone numbers', async ({ page }) => {
  await page.goto('/ar/auth');
  await page.locator('#phone').fill('1234');
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('main [role=alert]')).toContainText('رقم جوال سعودي');
});

test('signed-out users are sent to sign-in', async ({ page }) => {
  await page.goto('/ar/workspace');
  await expect(page).toHaveURL(/\/ar\/auth/);
});
