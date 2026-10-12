import { expect, test, type APIRequestContext, type Browser } from '@playwright/test';
import { addPropertyUnitLease, onboardOwner, signUpEmail, verifyEmail } from './helpers';

/** A person with a verified account who is not yet part of any organization. */
async function verifiedPerson(browser: Browser, request: APIRequestContext, email: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUpEmail(page, email);
  await expect(page).toHaveURL(/\/ar\/onboarding/, { timeout: 30_000 });
  await verifyEmail(request, email);
  return { ctx, page };
}

test('a unit owner is linked to a building: sees their balance, is reminded, and votes for their unit', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(240_000);
  const stamp = Date.now();
  const unitEmail = `unit-${stamp}@rasikh.test`;
  const person = await verifiedPerson(browser, request, unitEmail);

  const octx = await browser.newContext();
  const o = await octx.newPage();
  await onboardOwner(o, `bl-owner-${stamp}@rasikh.test`);
  await o.getByRole('tab', { name: 'العمارات والجمعيات' }).click();
  await o.getByLabel('اسم العمارة').fill('عمارة الملاك');
  await o.getByRole('button', { name: 'أضف عمارة' }).click();
  await expect(o.getByTestId('building-board')).toBeVisible({ timeout: 20_000 });
  await o.getByLabel('اسم المالك', { exact: true }).first().fill('سالم');
  await o.getByLabel('الوحدة', { exact: true }).fill('1');
  await o.getByLabel('النصيب من المصاريف (%)').fill('100');
  await o.getByRole('button', { name: 'أضف مالكاً' }).click();
  await expect(o.locator('#bm-name')).toHaveValue('');
  await o.getByLabel('البيان').fill('صيانة المصعد');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).first().fill('1000');
  await o
    .locator('#be-receipt')
    .setInputFiles({ name: 'r.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByTestId('bexpense-row')).toHaveCount(1, { timeout: 20_000 });
  await o.getByLabel('موضوع التصويت').fill('اعتماد الميزانية');
  await o.getByRole('button', { name: 'أنشئ تصويتاً' }).click();
  await expect(o.getByTestId('vote-box')).toBeVisible({ timeout: 20_000 });

  // link the unit owner by email
  await o.getByLabel('بريد المالك').fill(unitEmail);
  await o.getByRole('button', { name: 'اربط بحساب' }).click();
  await expect(o.getByTestId('member-row')).toContainText('مرتبط بحساب', { timeout: 20_000 });

  // the unit owner now sees the building, owes the full amount (a free in-app reminder) and votes for their unit
  await person.page.goto('/ar/workspace');
  await expect(person.page.getByTestId('owner-building')).toBeVisible({ timeout: 30_000 });
  await expect(person.page.getByTestId('my-balance')).toContainText('1,000');
  await expect(person.page.getByTestId('owner-expense')).toHaveCount(1);
  await person.page.getByRole('button', { name: 'موافق', exact: true }).click();
  await expect(person.page.getByTestId('vote-result')).toContainText('أُقرّ', { timeout: 20_000 });
  // one ballot per unit: the buttons are gone, and the manager sees the same result
  await expect(person.page.getByRole('button', { name: 'موافق', exact: true })).toHaveCount(0);
  await expect(o.getByTestId('vote-result')).toContainText('أُقرّ', { timeout: 20_000 });

  await octx.close();
  await person.ctx.close();
});

test('a vendor with their own login sees only their ticket, starts it and records the repair', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(240_000);
  const stamp = Date.now();
  const vendorEmail = `vendor-${stamp}@rasikh.test`;
  const vendor = await verifiedPerson(browser, request, vendorEmail);

  const octx = await browser.newContext();
  const o = await octx.newPage();
  await onboardOwner(o, `vl-owner-${stamp}@rasikh.test`);
  await addPropertyUnitLease(o, {
    tenantEmail: `nobody-${stamp}@rasikh.test`,
    property: 'برج المنفذين',
    unit: 'شقة 2',
    ejarNo: 'VND-2026-01',
  });
  await o.getByRole('tab', { name: 'الصيانة' }).click();
  await o.getByLabel('عنوان البلاغ').fill('عطل في المكيف');
  await o.getByLabel('التصنيف').selectOption('ac');
  await o.getByRole('button', { name: 'أرسل البلاغ' }).click();
  await expect(o.getByTestId('ticket-detail')).toBeVisible({ timeout: 30_000 });
  await o.getByLabel('جهة التنفيذ', { exact: true }).fill('مؤسسة التبريد');
  await o.getByLabel('بريد جهة التنفيذ (اختياري)').fill(vendorEmail);
  await o.getByRole('button', { name: 'أسند' }).click();
  await expect(o.getByTestId('status')).toContainText('مؤسسة التبريد', { timeout: 20_000 });

  // the vendor signs in to the same organization and sees only that ticket
  await vendor.page.goto('/ar/workspace');
  await expect(vendor.page.getByText('البلاغات المسندة إليّ')).toBeVisible({ timeout: 30_000 });
  await expect(vendor.page.getByTestId('ticket-row')).toHaveCount(1);
  await expect(vendor.page.getByLabel('عنوان البلاغ')).toHaveCount(0); // a vendor cannot open new requests
  await vendor.page.getByTestId('ticket-row').click();
  await expect(vendor.page.getByRole('button', { name: 'ألغِ البلاغ' })).toHaveCount(0);
  await vendor.page.getByRole('button', { name: 'بدأ التنفيذ' }).click();
  await expect(vendor.page.getByTestId('status')).toContainText('قيد التنفيذ', { timeout: 20_000 });
  await vendor.page.getByLabel('ملاحظة الإصلاح').fill('تم تنظيف الوحدة وتعبئة الغاز');
  await vendor.page.getByRole('button', { name: 'تم الإصلاح' }).click();
  await expect(vendor.page.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });
  await expect(vendor.page.getByRole('button', { name: 'أغلق الطلب' })).toHaveCount(0);

  await expect(o.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });
  await octx.close();
  await vendor.ctx.close();
});
