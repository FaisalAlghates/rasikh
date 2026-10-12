import { expect, test } from '@playwright/test';
import { onboardOwner, PASSWORD } from './helpers';

test('PDPL: download my data, then delete my account with a password; the sign-in is gone', async ({
  browser,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  const email = `pdpl-${Date.now()}@rasikh.test`;
  await onboardOwner(p, email);

  await p.getByRole('tab', { name: 'خصوصيتي' }).click();
  await expect(p.getByTestId('privacy-panel')).toBeVisible();

  const [download] = await Promise.all([
    p.waitForEvent('download', { timeout: 30_000 }),
    p.getByRole('button', { name: 'نزّل نسخة من بياناتي' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('rasikh-my-data.json');
  await expect(p.getByText('تم تنزيل الملف.')).toBeVisible();

  // Delete is disabled until confirmed, and a wrong password does nothing.
  const del = p.getByRole('button', { name: 'احذف حسابي نهائياً' });
  await expect(del).toBeDisabled();
  await p.locator('#del-pw').fill('wrong-password-1');
  await p.locator('#del-sure').check();
  await del.click();
  await expect(p.getByText('كلمة المرور غير صحيحة.')).toBeVisible({ timeout: 15_000 });

  await p.locator('#del-pw').fill(PASSWORD);
  await del.click();
  // Signed out: the workspace sends a signed-out visitor to the sign-in page (or the landing page).
  await expect(p).toHaveURL(/\/ar(\/auth)?\/?$/, { timeout: 30_000 });

  // The account no longer exists: signing in again fails.
  await p.goto('/ar/auth');
  await p.getByRole('tab').nth(1).click();
  await p.locator('#email').fill(email);
  await p.locator('#password').fill(PASSWORD);
  await p.locator('form button[type=submit]').click();
  await expect(p).toHaveURL(/\/ar\/auth/);
  await expect(p.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible({
    timeout: 15_000,
  });
});
