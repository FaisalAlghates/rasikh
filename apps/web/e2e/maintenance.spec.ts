import { expect, test } from '@playwright/test';
import { addPropertyUnitLease, onboardOwner, tenantJoins } from './helpers';

test('maintenance: tenant reports with a photo, owner assigns and resolves, tenant closes and rates', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(240_000);
  const stamp = Date.now();
  const ownerEmail = `mt-owner-${stamp}@rasikh.test`;
  const tenantEmail = `mt-tenant-${stamp}@rasikh.test`;

  const oCtx = await browser.newContext();
  const o = await oCtx.newPage();
  await onboardOwner(o, ownerEmail);
  await addPropertyUnitLease(o, {
    tenantEmail,
    property: 'برج الصيانة',
    unit: 'شقة 7',
    ejarNo: 'MNT-2026-01',
  });

  const tCtx = await browser.newContext();
  const t = await tCtx.newPage();
  await tenantJoins(t, request, tenantEmail);
  await t.getByLabel('عنوان البلاغ').fill('تسريب تحت المغسلة');
  await t.getByLabel('التصنيف').selectOption('plumbing');
  await t.getByLabel('الأولوية').selectOption('urgent');
  await t.locator('#tk-photo').setInputFiles({
    name: 'leak.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([255, 216, 255, 224, 0, 16]),
  });
  await t.getByRole('button', { name: 'أرسل البلاغ' }).click();
  await expect(t.getByTestId('ticket-detail')).toBeVisible({ timeout: 30_000 });
  await expect(t.getByTestId('suggested')).toContainText('على المالك');
  await expect(t.getByTestId('sla')).toContainText('ضمن المدة');

  // owner assigns a vendor, starts and resolves
  await o.reload();
  await o.getByRole('tab', { name: 'الصيانة' }).click();
  await o.getByTestId('ticket-row').click();
  await o.getByLabel('جهة التنفيذ', { exact: true }).fill('مؤسسة السباكة');
  await o.getByRole('button', { name: 'أسند' }).click();
  await expect(o.getByTestId('status')).toContainText('مؤسسة السباكة', { timeout: 20_000 });
  await o.getByRole('button', { name: 'بدأ التنفيذ' }).click();
  await expect(o.getByTestId('status')).toContainText('قيد التنفيذ', { timeout: 20_000 });
  await o.getByLabel('ملاحظة الإصلاح').fill('تم تبديل الوصلة');
  await o.getByRole('button', { name: 'تم الإصلاح' }).click();
  await expect(o.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });

  // tenant closes and rates
  await expect(t.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });
  await t.getByLabel('التقييم (من 5)').selectOption('4');
  await t.getByRole('button', { name: 'أغلق وقيّم' }).click();
  await expect(t.getByTestId('status')).toContainText('مغلق', { timeout: 20_000 });
  await expect(t.getByText('التقييم: 4 من 5')).toBeVisible();

  await oCtx.close();
  await tCtx.close();
});
