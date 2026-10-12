import { expect, test } from '@playwright/test';
import { signUpEmail } from './helpers';

const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test('broker: FAL reminder, lead funnel, viewing, contract, immutable log and the ad checker', async ({
  browser,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(180_000);
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  // A broker signs up with only the broker role.
  await signUpEmail(p, `broker-${Date.now()}@rasikh.test`);
  await expect(p).toHaveURL(/\/ar\/onboarding/);
  await p.getByText('وسيط', { exact: true }).click();
  await p.locator('#displayName').fill('سلمان');
  await p.locator('#orgName').fill('مكتب الأفق');
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p).toHaveURL(/\/ar\/workspace/, { timeout: 30_000 });
  await expect(p.getByTestId('broker-view')).toBeVisible({ timeout: 20_000 });

  // Profile: a license that ends in 20 days shows the reminder.
  await p.locator('#bp-name').fill('سلمان');
  await p.locator('#bp-fal').fill('1234567890');
  await p.locator('#bp-exp').fill(isoIn(20));
  await p.getByRole('button', { name: 'احفظ الملف' }).click();
  await expect(p.getByTestId('fal-state')).toContainText('تنتهي رخصتك خلال', { timeout: 15_000 });

  // Leads: a bad phone is refused, a good one is added.
  await p.locator('#ld-name').fill('خالد');
  await p.locator('#ld-phone').fill('0512345678');
  await p.getByRole('button', { name: 'أضف عميلاً' }).click();
  await expect(p.getByText('أكمل الحقول المطلوبة بشكل صحيح.')).toBeVisible();
  await p.locator('#ld-phone').fill('+966512345678');
  await p.getByRole('button', { name: 'أضف عميلاً' }).click();
  await expect(p.getByTestId('lead-row')).toHaveCount(1, { timeout: 20_000 });

  await p.getByRole('button', { name: 'افتح' }).click();
  await expect(p.getByTestId('lead-detail')).toBeVisible();
  await expect(p.getByTestId('lead-status')).toContainText('جديد');

  // Funnel: forward only.
  await p.getByRole('button', { name: 'انقله إلى تم التواصل' }).click();
  await expect(p.getByTestId('lead-status')).toContainText('تم التواصل', { timeout: 15_000 });
  await expect(p.getByRole('button', { name: 'انقله إلى جديد' })).toHaveCount(0);

  // Viewing, then done.
  await p.locator('#vw-place').fill('فيلا النرجس');
  await p.locator('#vw-when').fill('2026-12-01T15:00');
  await p.getByRole('button', { name: 'حدّد معاينة' }).click();
  await expect(p.getByTestId('viewing-row')).toHaveCount(1, { timeout: 15_000 });
  await p.getByRole('button', { name: 'تمت المعاينة' }).click();
  await expect(p.getByTestId('viewing-row')).toContainText('تمت', { timeout: 15_000 });

  // Brokerage contract.
  await p.locator('#bc-no').fill('BR-2026-001');
  await p.locator('#bc-end').fill(isoIn(365));
  await p.getByRole('button', { name: 'أضف عقد وساطة' }).click();
  await expect(p.getByTestId('contract-row')).toHaveCount(1, { timeout: 15_000 });

  // The log keeps every step, oldest first, and offers no way to edit or delete.
  await p.locator('#log-note').fill('اتفقنا على المعاينة مساءً');
  await p.getByRole('button', { name: 'أضف ملاحظة' }).click();
  const log = p.getByTestId('activity-log').locator('li');
  await expect(log).toHaveCount(6, { timeout: 15_000 }); // created, status, viewing x2, contract, note
  await expect(log.first()).toContainText('أُضيف العميل');
  await expect(log.last()).toContainText('اتفقنا على المعاينة مساءً');
  await expect(p.getByTestId('activity-log').getByRole('button')).toHaveCount(0);

  // Ad checker: empty draft is not ready; a complete one is.
  await p.getByRole('button', { name: 'رجوع' }).click();
  await expect(p.getByTestId('ad-verdict')).toContainText('ينقص الإعلان');
  expect(await p.getByTestId('ad-issue').count()).toBeGreaterThan(5);

  await p.locator('#ad-purpose').selectOption({ label: 'إيجار' });
  await p.locator('#ad-adv').fill('مكتب الأفق العقاري');
  await p.locator('#ad-cap').selectOption({ label: 'وسيط' });
  await p.locator('#ad-lic').fill('1234567890');
  await p.locator('#ad-exp').fill(isoIn(400));
  await p.locator('#ad-city').fill('الرياض');
  await p.locator('#ad-dist').fill('حي النرجس');
  await p.locator('#ad-type').fill('شقة');
  await p.locator('#ad-area').fill('140');
  await p.locator('#ad-price').fill('48000');
  await p.locator('#ad-phone').fill('+966512345678');
  await p.locator('#ad-enc').selectOption({ label: 'لا يوجد' });
  await p.locator('#ad-desc').fill('شقة من ثلاث غرف في الدور الثاني، قريبة من الخدمات والمدارس.');
  await expect(p.getByTestId('ad-verdict')).toContainText('بيانات الإعلان مكتملة');
  await expect(p.getByTestId('ad-issue')).toHaveCount(0);

  // An expired ad license blocks it again.
  await p.locator('#ad-exp').fill(isoIn(-1));
  await expect(p.getByTestId('ad-verdict')).toContainText('ينقص الإعلان');
  await expect(p.getByTestId('ad-issue')).toContainText('انتهى ترخيص الإعلان');
});
