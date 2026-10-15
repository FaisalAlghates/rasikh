import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { signUpEmail } from './helpers';

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-rasikh';

/** Emulator stand-in for scripts/set-platform-admin.mjs (the Admin SDK sets the same claim in production). */
async function grantPlatformAdmin(request: APIRequestContext, email: string) {
  const headers = { Authorization: 'Bearer owner' };
  const found = await request.post(`${AUTH}/accounts:lookup`, {
    headers,
    data: { email: [email] },
  });
  const { users } = (await found.json()) as { users: Array<{ localId: string }> };
  const res = await request.post(`${AUTH}/accounts:update`, {
    headers,
    data: { localId: users[0]!.localId, customAttributes: JSON.stringify({ platformAdmin: true }) },
  });
  expect(res.ok()).toBe(true);
}

test('team inbox: only a platform admin reads visitor messages, answers and deletes them', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'desktop flow');
  test.setTimeout(180_000);
  const note = `اختبار صندوق الفريق ${Date.now()}`;

  // a visitor writes in
  const visitor = await browser.newPage();
  await visitor.goto('/ar/contact');
  await visitor.getByLabel('الاسم *').fill('زائر');
  await visitor.getByLabel('البريد الإلكتروني *').fill('visitor@example.com');
  await visitor.getByLabel('رسالتك *').fill(note);
  await visitor.getByLabel('أوافق على استخدام اسمي وبريدي للرد على هذه الرسالة فقط.').check();
  await visitor.getByRole('button', { name: 'أرسل الرسالة' }).click();
  await expect(visitor.getByTestId('contact-sent')).toBeVisible({ timeout: 20_000 });
  await visitor.close();

  // a signed-in person without the team permission is turned away
  const email = `team-${Date.now()}@rasikh.test`;
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await signUpEmail(p, email);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await p.goto('/ar/admin');
  await expect(p.getByTestId('admin-no-access')).toBeVisible({ timeout: 30_000 });

  // with the permission: the message is there, can be answered and deleted
  await grantPlatformAdmin(request, email);
  await p.reload();
  const msg = p.getByTestId('admin-message').filter({ hasText: note });
  await expect(msg).toBeVisible({ timeout: 30_000 });
  await expect(msg.getByRole('link', { name: 'رد بالبريد' })).toHaveAttribute(
    'href',
    /^mailto:visitor%40example\.com/,
  );
  expect(
    await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze(),
  ).toHaveProperty('violations', []);
  await msg.getByRole('button', { name: 'علّمها: تم الرد' }).click();
  await expect(msg).toHaveCount(0); // it leaves the "new" list
  await p.getByRole('button', { name: /^تم الرد/ }).click();
  await expect(msg).toContainText('تم الرد');
  await msg.getByRole('button', { name: 'احذف' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'احذف نهائياً' }).click();
  await expect(msg).toHaveCount(0, { timeout: 20_000 });

  // page ratings are summarised per page
  await p.getByRole('tab', { name: 'تقييمات الصفحات' }).click();
  await expect(p.getByTestId('feedback-table').or(p.getByText('لا تقييمات بعد.'))).toBeVisible();
  await ctx.close();
});
