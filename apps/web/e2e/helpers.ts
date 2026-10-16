import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const PASSWORD = 'Ops-pass-2026!';

export async function signUpEmail(page: Page, email: string) {
  await page.goto('/ar/auth');
  await page.getByRole('tab').nth(1).click();
  await page.locator('form').getByRole('button').last().click(); // switch to "create account"
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('form button[type=submit]').click();
}

/** Emulator stand-in for clicking the link in the verification email. */
export async function verifyEmail(request: APIRequestContext, email: string) {
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

/** Signs up, onboards as an owner and lands in the workspace. */
export async function onboardOwner(page: Page, email: string) {
  await signUpEmail(page, email);
  // The first visit to each page compiles in the dev server, which is slow on a shared CI runner.
  await expect(page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await page.getByRole('button', { name: /إدارة الأملاك/ }).click();
  await page.getByText('مالك', { exact: true }).click();
  await page.locator('#displayName').fill('فيصل');
  await page.locator('#orgName').fill('عقارات الاختبار');
  await page.locator('input[type=checkbox]').last().check();
  await page.locator('main button').last().click();
  await expect(page).toHaveURL(/\/ar\/workspace/, { timeout: 30_000 });
}

/** Property → apartment unit → lease for `tenantEmail`, starting 2026-01-01 for a year. */
export async function addPropertyUnitLease(
  page: Page,
  opts: { tenantEmail: string; property: string; unit: string; ejarNo: string },
) {
  await page.getByRole('tab', { name: 'العقارات والوحدات' }).click();
  await page.getByLabel('الاسم', { exact: true }).fill(opts.property);
  await page.getByRole('button', { name: 'أضف عقاراً' }).click();
  await expect(page.getByTestId(`property-${opts.property}`)).toBeVisible();
  await page.getByLabel('رقم أو اسم الوحدة').fill(opts.unit);
  await page.getByRole('button', { name: 'أضف وحدة' }).last().click();
  await expect(page.getByTestId(`unit-${opts.unit}`)).toBeVisible();
  await page.getByRole('button', { name: 'أضف عقداً' }).click();
  await page.getByLabel('رقم عقد إيجار').fill(opts.ejarNo);
  await page.getByLabel('اسم المستأجر').fill('سالم');
  await page.getByLabel('بريد المستأجر (للدعوة)').fill(opts.tenantEmail);
  await page.getByLabel('بداية العقد').fill('2026-01-01');
  await page.getByLabel('نهاية العقد').fill('2027-01-01');
  await page.getByLabel('الإيجار السنوي (ر.س)').fill('42000');
  await page.getByRole('button', { name: 'احفظ العقد وأنشئ الجدول' }).click();
  await expect(page.getByTestId('lease-detail')).toBeVisible({ timeout: 30_000 });
}

/** Tenant signs up with the invited address, verifies it and reaches their lease. */
export async function tenantJoins(page: Page, request: APIRequestContext, email: string) {
  await signUpEmail(page, email);
  await expect(page).toHaveURL(/\/ar\/onboarding/, { timeout: 30_000 });
  await verifyEmail(request, email);
  await page.getByRole('button', { name: 'تحققت' }).click();
  await expect(page.getByTestId('my-lease')).toBeVisible({ timeout: 30_000 });
}

const AUTH_ADMIN = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-rasikh';

/** Emulator stand-in for scripts/set-platform-admin.mjs (the Admin SDK sets the same claim in production). */
export async function grantPlatformAdmin(request: APIRequestContext, email: string) {
  const headers = { Authorization: 'Bearer owner' };
  const found = await request.post(`${AUTH_ADMIN}/accounts:lookup`, {
    headers,
    data: { email: [email] },
  });
  const { users } = (await found.json()) as {
    users: Array<{ localId: string; customAttributes?: string }>;
  };
  const user = users[0]!;
  const claims = {
    ...(user.customAttributes ? JSON.parse(user.customAttributes) : {}),
    platformAdmin: true,
  };
  const res = await request.post(`${AUTH_ADMIN}/accounts:update`, {
    headers,
    data: { localId: user.localId, customAttributes: JSON.stringify(claims) },
  });
  expect(res.ok()).toBe(true);
}
