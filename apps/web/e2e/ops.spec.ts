import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

async function signUpEmail(page: Page, email: string) {
  await page.goto('/ar/auth');
  await page.getByRole('tab').nth(1).click();
  await page.locator('form').getByRole('button').last().click(); // switch to "create account"
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Ops-pass-2026!');
  await page.locator('form button[type=submit]').click();
}

/** Emulator stand-in for clicking the link in the verification email. */
async function verifyEmail(request: APIRequestContext, email: string) {
  await expect
    .poll(
      async () => {
        const res = await request.get(
          'http://127.0.0.1:9099/emulator/v1/projects/demo-rasikh/oobCodes',
        );
        const { oobCodes } = (await res.json()) as {
          oobCodes: { email: string; requestType: string; oobLink: string }[];
        };
        const hit = oobCodes
          .filter((o) => o.email === email && o.requestType === 'VERIFY_EMAIL')
          .pop();
        if (!hit) return false;
        await request.get(hit.oobLink);
        return true;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

test('owner: property → unit → lease → schedule → payment; tenant sees it and uploads a receipt', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(180_000);
  const stamp = Date.now();
  const ownerEmail = `owner-${stamp}@rasikh.test`;
  const tenantEmail = `tenant-${stamp}@rasikh.test`;

  // ---------------------------------------------------------------- owner
  const oCtx = await browser.newContext();
  const o = await oCtx.newPage();
  await signUpEmail(o, ownerEmail);
  await expect(o).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await o.getByText('مالك', { exact: true }).click();
  await o.locator('#displayName').fill('فيصل');
  await o.locator('#orgName').fill('عقارات الاختبار');
  await o.locator('input[type=checkbox]').last().check();
  await o.locator('main button').last().click();
  await expect(o).toHaveURL(/\/ar\/workspace/, { timeout: 30_000 });

  await o.getByRole('tab', { name: 'العقارات والوحدات' }).click();
  await o.getByLabel('الاسم', { exact: true }).fill('عمارة الاختبار');
  await o.getByRole('button', { name: 'أضف عقاراً' }).click();
  await expect(o.getByTestId('property-عمارة الاختبار')).toBeVisible();

  await o.getByLabel('رقم أو اسم الوحدة').fill('شقة 3');
  await o.getByRole('button', { name: 'أضف وحدة' }).last().click();
  await expect(o.getByTestId('unit-شقة 3')).toBeVisible();

  await o.getByRole('button', { name: 'أضف عقداً' }).click();
  await o.getByLabel('رقم عقد إيجار').fill('10203040');
  await o.getByLabel('اسم المستأجر').fill('سالم');
  await o.getByLabel('بريد المستأجر (للدعوة)').fill(tenantEmail);
  await o.getByLabel('بداية العقد').fill('2026-01-01');
  await o.getByLabel('نهاية العقد').fill('2027-01-01');
  await o.getByLabel('الإيجار السنوي (ر.س)').fill('42000');
  await o.getByLabel('الإيجار السابق (عند التجديد)').fill('40000');
  // Riyadh renewal that raises the rent during the freeze → warning, never a block
  await expect(o.getByTestId('freeze-warning')).toContainText('40,000');
  await o.getByRole('button', { name: 'احفظ العقد وأنشئ الجدول' }).click();

  await expect(o.getByTestId('lease-detail')).toBeVisible({ timeout: 30_000 });
  await expect(o.locator('[data-testid^="pay-"]')).toHaveCount(12);
  await expect(o.getByTestId('pay-2026-01-01')).toContainText('3,500');
  await o.getByTestId('pay-2026-01-01').getByRole('button', { name: 'سجّل الدفع' }).click();
  await expect(o.getByTestId('pay-2026-01-01')).toContainText('مدفوعة');

  // expenses + annual report
  await o.getByRole('tab', { name: 'المصروفات' }).click();
  await o.getByLabel('المبلغ', { exact: true }).fill('500');
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByTestId('expense-row')).toHaveCount(1);
  await o.getByRole('tab', { name: 'التقرير السنوي' }).click();
  await expect(o.getByTestId('total-collected')).toContainText('3,500');
  await expect(o.getByTestId('total-expenses')).toContainText('500');
  await expect(o.getByTestId('total-net')).toContainText('3,000');

  // free reminders: live in-app alerts + a calendar file (no server, no money)
  await o.getByRole('tab', { name: 'نظرة عامة' }).click();
  await expect(o.getByTestId('reminders')).toContainText('دفعة متأخرة');
  await o.getByRole('tab', { name: 'العقود والدفعات' }).click();
  const [download] = await Promise.all([
    o.waitForEvent('download'),
    o.getByTestId('add-to-calendar').click(),
  ]);
  const ics = readFileSync((await download.path())!, 'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('DTSTART;VALUE=DATE:20261101');
  expect(ics).toContain('TRIGGER:-P3D');
  expect(download.suggestedFilename()).toBe('rasikh-10203040.ics');

  // ---------------------------------------------------------------- tenant
  const tCtx = await browser.newContext();
  const t = await tCtx.newPage();
  await signUpEmail(t, tenantEmail);
  await expect(t).toHaveURL(/\/ar\/onboarding/, { timeout: 30_000 }); // unverified email: invite not applied yet
  await expect(t.getByTestId('verify-banner')).toBeVisible();
  await verifyEmail(request, tenantEmail);
  await t.getByRole('button', { name: 'تحققت' }).click();

  await expect(t.getByTestId('my-lease')).toBeVisible({ timeout: 30_000 });
  await expect(t.locator('[data-testid^="pay-"]')).toHaveCount(12);
  await expect(t.getByRole('button', { name: 'سجّل الدفع' })).toHaveCount(0); // tenants never record payments
  await expect(t.getByTestId('pay-2026-01-01')).toContainText('مدفوعة'); // what the owner recorded

  await t.getByLabel('ارفع الإيصال 2026-02-01').setInputFiles({
    name: 'receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test'),
  });
  await expect(
    t.getByTestId('pay-2026-02-01').getByRole('button', { name: 'عرض الإيصال' }),
  ).toBeVisible({
    timeout: 20_000,
  });

  // the owner sees the tenant's receipt
  await o.reload();
  await o.getByRole('tab', { name: 'العقود والدفعات' }).click();
  await o.getByTestId('lease-10203040').click();
  await expect(
    o.getByTestId('pay-2026-02-01').getByRole('button', { name: 'عرض الإيصال' }),
  ).toBeVisible({
    timeout: 20_000,
  });

  await oCtx.close();
  await tCtx.close();
});
