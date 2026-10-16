import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addPropertyUnitLease, onboardOwner, tenantJoins } from './helpers';

const SHOTS = '../../docs/screenshots/shell';
const PUBLIC = [
  '/ar',
  '/ar/map',
  '/ar/engineering',
  '/ar/about',
  '/ar/help',
  '/ar/contact',
  '/ar/sitemap',
  '/ar/search',
  '/ar/accessibility',
  '/ar/privacy',
  '/ar/auth',
];

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

test('shell: every public page has the shared header, a skip link, one h1 and the footer; no sideways scroll', async ({
  page,
}) => {
  test.setTimeout(240_000);
  for (const path of PUBLIC) {
    await page.goto(path, { timeout: 60_000 });
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'تخطَّ إلى المحتوى' })).toHaveAttribute(
      'href',
      '#main',
    );
    await expect(page.locator('#main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(1);
  }
});

test('shell: the header links every main page and marks the current one', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120_000);
  await page.goto('/ar');
  const go = async (name: string) => {
    if (isMobile) {
      await page.getByRole('button', { name: 'افتح القائمة' }).click();
      await page.getByRole('dialog').getByRole('link', { name, exact: true }).click();
    } else {
      await page
        .getByRole('navigation', { name: 'التنقل الرئيسي' })
        .getByRole('link', { name, exact: true })
        .click();
    }
  };
  for (const [name, path] of [
    ['عن راسخ', '/ar/about'],
    ['مركز المساعدة', '/ar/help'],
    ['تواصل معنا', '/ar/contact'],
    ['خريطة المملكة', '/ar/map'],
  ] as const) {
    await go(name);
    await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 45_000 });
    if (!isMobile) {
      await expect(
        page
          .getByRole('navigation', { name: 'التنقل الرئيسي' })
          .getByRole('link', { name, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }
  }
  // breadcrumbs lead back home
  await page.goto('/ar/help');
  await page
    .getByRole('navigation', { name: 'مسار التصفح' })
    .getByRole('link', { name: 'الرئيسية' })
    .click();
  await expect(page).toHaveURL(/\/ar$/);
});

test('shell: the footer reaches the sitemap, and the sitemap reaches every public page', async ({
  page,
}) => {
  await page.goto('/ar/about');
  await page.getByRole('contentinfo').getByRole('link', { name: 'خريطة الموقع' }).click();
  await expect(page).toHaveURL(/\/ar\/sitemap$/, { timeout: 45_000 });
  for (const name of [
    'خريطة المملكة',
    'مركز المساعدة',
    'تواصل معنا',
    'سياسة الخصوصية',
    'إمكانية الوصول',
  ]) {
    await expect(page.locator('main').getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('main')).toContainText('مقدم خدمة');
});

test('search: the header dialog suggests while typing, and the results page finds help answers', async ({
  page,
}) => {
  await page.goto('/ar/about');
  await page.getByRole('button', { name: 'افتح البحث' }).click();
  const box = page.getByRole('combobox', { name: 'البحث' });
  await box.fill('خصوصيه'); // ta marbuta written as ha still matches
  await expect(page.getByRole('option').first()).toContainText('سياسة الخصوصية');
  await page.getByRole('button', { name: 'امسح البحث' }).click();
  await expect(box).toHaveValue('');
  await box.fill('ايصال');
  await page.getByRole('link', { name: 'اعرض كل النتائج' }).click();
  await expect(page).toHaveURL(/\/ar\/search\?q=/, { timeout: 45_000 });
  const results = page.getByTestId('search-results');
  await expect(results).toContainText('كيف أسجّل دفعة أو أرفع إيصالاً؟');
  await results.getByRole('link', { name: 'كيف أسجّل دفعة أو أرفع إيصالاً؟' }).click();
  await expect(page).toHaveURL(/\/ar\/help#leases-1$/, { timeout: 45_000 });
  await expect(page.locator('#leases-1')).toHaveAttribute('open', '');
});

test('help: the question filter narrows the list live', async ({ page }) => {
  await page.goto('/ar/help');
  await expect(page.locator('details.faq')).toHaveCount(19);
  await page.getByLabel('ابحث في الأسئلة').fill('تصويت');
  await expect(page.locator('details.faq')).toHaveCount(2);
  await expect(page.getByRole('status').filter({ hasText: 'مطابق' })).toBeVisible();
});

test('contact: errors are summarised and tied to fields; a valid message gets a reference', async ({
  page,
}) => {
  await page.goto('/ar/contact');
  await page.getByRole('button', { name: 'أرسل الرسالة' }).click();
  const summary = page.getByTestId('error-summary');
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('listitem')).toHaveCount(4);
  await expect(page.locator('#c-email')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('الاسم *').fill('سارة');
  await page.getByLabel('البريد الإلكتروني *').fill('sara@example.com');
  await page.getByLabel('نوع الرسالة').selectOption('accessibility');
  await page.getByLabel('رسالتك *').fill('زر التصفية في الخريطة صغير على الجوال.');
  await page.getByLabel('أوافق على استخدام اسمي وبريدي للرد على هذه الرسالة فقط.').check();
  await page.getByRole('button', { name: 'أرسل الرسالة' }).click();
  await expect(page.getByTestId('contact-sent')).toContainText('رقم المرجع', { timeout: 20_000 });
});

test('feedback: "was this page helpful?" takes a reason and confirms', async ({ page }) => {
  await page.goto('/ar/accessibility');
  const box = page.getByTestId('page-feedback');
  await box.getByRole('button', { name: 'لا' }).click();
  await box.getByLabel('لم أجد ما أبحث عنه').check();
  await box.getByLabel('ملاحظتك (اختياري)').fill('أريد مثالاً على قارئ الشاشة');
  await box.getByRole('button', { name: 'أرسل' }).click();
  await expect(box).toContainText('شكراً لك', { timeout: 20_000 });
});

test('cookies: the notice explains essential storage only and stays dismissed', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto('/ar/about');
  const notice = page.getByTestId('cookie-notice');
  await expect(notice).toContainText('ضرورياً فقط');
  await expect(notice.getByRole('link', { name: 'التفاصيل في سياسة الخصوصية' })).toHaveAttribute(
    'href',
    '/ar/privacy#cookies',
  );
  await notice.getByRole('button', { name: 'فهمت' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('cookie-notice')).toHaveCount(0);
  await ctx.close();
});

test('accessibility tools: larger text and higher contrast are remembered', async ({ page }) => {
  await page.goto('/ar/help');
  const tools = page.getByRole('group', { name: 'أدوات إمكانية الوصول' });
  await tools.getByRole('button', { name: 'تكبير الخط' }).click();
  await tools.getByRole('button', { name: 'تباين أعلى' }).click();
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('112.5%');
  expect(await page.evaluate(() => document.documentElement.dataset.contrast)).toBe('more');
  await page
    .getByRole('group', { name: 'أدوات إمكانية الوصول' })
    .getByRole('button', { name: 'حجم الخط الافتراضي' })
    .click();
  await page
    .getByRole('group', { name: 'أدوات إمكانية الوصول' })
    .getByRole('button', { name: 'تباين أعلى' })
    .click();
  expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('');
});

test('404: unknown addresses get a friendly page with a way home', async ({ page }) => {
  const res = await page.goto('/ar/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('لم نجد الصفحة');
  await page.getByRole('link', { name: 'العودة إلى الرئيسية' }).click();
  await expect(page).toHaveURL(/\/ar$/);
});

test('a11y + screenshots: the new public pages', async ({ page }, info) => {
  test.setTimeout(240_000);
  for (const path of [
    'about',
    'help',
    'contact',
    'sitemap',
    'search',
    'accessibility',
    'map',
    'engineering',
  ]) {
    await page.goto(`/ar/${path}`, { timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-${path}.png`, fullPage: true });
    expect(await axe(page), `${path} page`).toEqual([]);
  }
  await page.goto('/ar/nothing-here');
  expect(await axe(page), '404 page').toEqual([]);
});

test('roles: an owner sees role badges, every workspace section has its own address, and Back works', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(120_000);
  await onboardOwner(page, `shell-owner-${Date.now()}@rasikh.test`);
  await expect(page.getByRole('list', { name: 'أدوارك' })).toContainText('مالك');
  await page.getByRole('tab', { name: 'العقود' }).click();
  await expect(page).toHaveURL(/\?s=leases/);
  await expect(page.getByRole('navigation', { name: 'مسار التصفح' })).toContainText('العقود');
  await page.getByRole('tab', { name: 'الصيانة' }).click();
  await expect(page).toHaveURL(/\?s=maintenance/);
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'العقود' })).toHaveAttribute('aria-selected', 'true');
  // a direct link opens the section
  await page.goto('/ar/workspace?s=expenses');
  await expect(page.getByRole('tab', { name: 'المصروفات' })).toHaveAttribute(
    'aria-selected',
    'true',
    {
      timeout: 30_000,
    },
  );
  // the account menu offers the places an owner may go, including their portfolio on the map
  await page.getByTestId('account-menu').click();
  await expect(page.getByTestId('role-badges')).toContainText('مالك');
  await page
    .getByTestId('account-menu')
    .locator('..')
    .getByRole('link', { name: 'خريطة المملكة' })
    .click();
  await expect(page).toHaveURL(/\/ar\/map$/, { timeout: 45_000 });
});

test('roles: one account in two organizations (tenant in one, owner of another) switches between them', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(240_000);
  const stamp = Date.now();
  const tenantEmail = `two-orgs-${stamp}@rasikh.test`;

  // an owner rents a unit to this person
  const octx = await browser.newContext();
  const o = await octx.newPage();
  await onboardOwner(o, `two-orgs-owner-${stamp}@rasikh.test`);
  await addPropertyUnitLease(o, {
    tenantEmail,
    property: 'برج الجوهرة',
    unit: 'شقة 4',
    ejarNo: 'TWO-2026-01',
  });
  await octx.close();

  // the tenant joins, then opens a workspace of their own as an owner
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await tenantJoins(p, request, tenantEmail);
  await p.getByTestId('account-menu').click();
  await p.getByRole('link', { name: 'أنشئ مساحة عمل جديدة' }).click();
  await expect(p).toHaveURL(/\/ar\/onboarding\?new=1/, { timeout: 45_000 });
  await p.getByRole('button', { name: /إدارة الأملاك/ }).click();
  await p.getByText('مالك', { exact: true }).click();
  await p.locator('#displayName').fill('نورة');
  await p.locator('#orgName').fill('أملاك نورة');
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p).toHaveURL(/\/ar\/workspace/, { timeout: 45_000 });
  await expect(p.getByRole('tab', { name: 'العقارات والوحدات' })).toBeVisible({ timeout: 30_000 });
  await expect(p.getByRole('list', { name: 'أدوارك' })).toContainText('مالك');

  // both organizations are in the menu, each with this person's role there
  await p.getByTestId('account-menu').click();
  const list = p.getByTestId('org-list');
  await expect(list.getByRole('button')).toHaveCount(2);
  await expect(list.getByRole('button', { name: /أملاك نورة/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await list.getByRole('button', { name: /عقارات الاختبار/ }).click();
  await expect(p.getByTestId('my-lease')).toContainText('برج الجوهرة', { timeout: 30_000 });
  await expect(p.getByRole('tab', { name: 'العقارات والوحدات' })).toHaveCount(0);
  await expect(p.getByRole('list', { name: 'أدوارك' })).toContainText('مستأجر');
  await ctx.close();
});
