import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { grantPlatformAdmin, signUpEmail, verifyEmail } from '../e2e/helpers';

/**
 * Records one walkthrough video per product section from the real app (emulators + demo data), with Arabic captions
 * burned into the page as the narration. Run on demand: `pnpm videos` (not part of the test suite).
 */
const OUT = 'public/videos';
const SIZE = { width: 1280, height: 720 };
const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const CAPTION_SCRIPT = `
(() => {
  const draw = () => {
    const t = sessionStorage.getItem('__cap');
    let el = document.getElementById('__cap');
    if (!t) { el && el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:28px;margin:0 auto;width:fit-content;max-width:78%;' +
        'background:rgba(14,13,11,.9);color:#F4EEE4;font:600 24px/1.7 "IBM Plex Sans Arabic",system-ui,sans-serif;' +
        'padding:12px 26px;border-radius:14px;z-index:2147483647;text-align:center;direction:rtl;pointer-events:none';
      document.documentElement.append(el);
    }
    el.textContent = t;
  };
  window.__drawCap = draw;
  document.addEventListener('DOMContentLoaded', draw);
  setInterval(draw, 400);
})();
`;

async function recorder(
  browser: Browser,
  name: string,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: `test-results/videos/${name}`, size: SIZE },
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:3000', localStorage: [{ name: 'rk-cookie-ok', value: '1' }] },
      ],
    },
  });
  await ctx.addInitScript(CAPTION_SCRIPT);
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept());
  return { ctx, page };
}

async function plain(browser: Browser) {
  const ctx = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:3000', localStorage: [{ name: 'rk-cookie-ok', value: '1' }] },
      ],
    },
  });
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept());
  return { ctx, page };
}

/** Shows a caption, holds it long enough to read. */
async function say(p: Page, text: string, hold = 2600) {
  await p.evaluate((t) => {
    sessionStorage.setItem('__cap', t);
    (window as unknown as { __drawCap?: () => void }).__drawCap?.();
  }, text);
  await p.waitForTimeout(hold);
}

async function finish(name: string, ctx: BrowserContext, page: Page) {
  await say(page, 'راسخ · عقارك على أرض ثابتة', 2500);
  const video = page.video();
  await ctx.close();
  mkdirSync(OUT, { recursive: true });
  copyFileSync(await video!.path(), `${OUT}/${name}.webm`);
}

/** Visits each route once, unrecorded, so the dev server has compiled them before the camera rolls. */
async function warm(browser: Browser) {
  const { ctx, page } = await plain(browser);
  for (const path of [
    '/ar',
    '/ar/auth',
    '/ar/onboarding',
    '/ar/workspace',
    '/ar/map',
    '/ar/design',
    '/ar/admin',
  ])
    await page.goto(path, { waitUntil: 'load' }).catch(() => undefined);
  await ctx.close();
}

async function landingToOnboarding(p: Page, section: string, sectionName: string, email: string) {
  await p.goto('/ar');
  await say(p, `راسخ يضم ثلاثة أقسام منفصلة. لنبدأ بقسم ${sectionName}`, 3200);
  await p.locator(`[data-section="${section}"]`).scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  await p.locator(`[data-section="${section}"]`).click();
  await expect(p).toHaveURL(new RegExp(`/ar/sections/${section}`), { timeout: 30_000 });
  await say(p, 'لكل قسم صفحته: فيديو شرح وخطوات الاستخدام، وهو مجاني الآن', 3400);
  await p.locator(`[data-start="${section}"]`).click();
  await expect(p).toHaveURL(/\/ar\/auth/, { timeout: 30_000 });
  await say(p, 'أنشئ حسابك بالبريد الإلكتروني، والقسم مجاني الآن', 2600);
  await signUpEmail(p, email);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
}

test.describe.configure({ mode: 'serial' });

test('video: property management', async ({ browser }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const { ctx, page: p } = await recorder(browser, 'property');
  const stamp = Date.now();
  await landingToOnboarding(p, 'property', 'إدارة الأملاك', `vid-owner-${stamp}@rasikh.test`);

  await say(p, 'اختر دورك، ثم اكتب اسمك واسم محفظتك', 2600);
  await p.getByText('مالك', { exact: true }).click();
  await p.locator('#displayName').fill('فيصل');
  await p.locator('#orgName').fill('عقارات الشمال');
  await p.waitForTimeout(800);
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p).toHaveURL(/\/ar\/workspace/, { timeout: 30_000 });
  await say(p, 'هذه مساحة عملك: ملخص الدفعات والتنبيهات في مكان واحد', 3400);

  await p.getByRole('tab', { name: 'العقارات والوحدات' }).click();
  await say(p, 'أضف العقار ثم وحداته', 2200);
  await p.getByLabel('الاسم', { exact: true }).fill('برج النرجس');
  await p.getByRole('button', { name: 'أضف عقاراً' }).click();
  await expect(p.getByTestId('property-برج النرجس')).toBeVisible();
  await p.getByLabel('رقم أو اسم الوحدة').fill('شقة 5');
  await p.getByRole('button', { name: 'أضف وحدة' }).last().click();
  await expect(p.getByTestId('unit-شقة 5')).toBeVisible();

  await say(p, 'سجّل عقد الإيجار برقم عقد إيجار، فتُنشأ جدولة الدفعات تلقائياً', 3000);
  await p.getByRole('button', { name: 'أضف عقداً' }).click();
  await p.getByLabel('رقم عقد إيجار').fill('55667788');
  await p.getByLabel('اسم المستأجر').fill('سالم');
  await p.getByLabel('بريد المستأجر (للدعوة)').fill(`vid-tenant-${stamp}@rasikh.test`);
  await p.getByLabel('بداية العقد').fill('2026-01-01');
  await p.getByLabel('نهاية العقد').fill('2027-01-01');
  await p.getByLabel('الإيجار السنوي (ر.س)').fill('42000');
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'احفظ العقد وأنشئ الجدول' }).click();
  await expect(p.getByTestId('lease-detail')).toBeVisible({ timeout: 30_000 });
  await say(p, 'راسخ يسجّل الدفعات ويذكّرك بالمتأخر والقريب، ولا يحصّل المال', 3400);

  await p.getByRole('tab', { name: 'الفحوصات' }).click();
  await say(p, 'الفحص عند الاستلام والتسليم: غرفة غرفة بصور موثقة بالوقت والموقع', 3600);
  await p.getByRole('tab', { name: 'الصيانة' }).click();
  await say(p, 'طلبات الصيانة بالصور، مع اقتراح من يتحمل التكلفة', 3200);
  await p.getByRole('tab', { name: 'العمارات والجمعيات' }).click();
  await say(p, 'للعمائر واتحادات الملاك: مصاريف بإيصالاتها وأرصدة يراها الجميع', 3400);
  await p.getByRole('tab', { name: 'سجل العقار' }).click();
  await say(p, 'سجل العقار: خط زمني لكل ما حدث، وينتقل للمالك الجديد بموافقتك', 3400);

  await p.getByRole('tab', { name: 'المساعد' }).click();
  await say(p, 'اسأل المساعد عن عقاراتك، وإجاباته من سجلاتك فقط', 2400);
  await p.locator('#ai-q').fill('كم عقداً عندي وهل في دفعات متأخرة؟');
  await p.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(p.getByTestId('ai-answer')).toBeVisible({ timeout: 30_000 });
  await say(p, 'كل إجابة موسومة بالذكاء الاصطناعي، وراجعها قبل الاعتماد', 3200);

  await p.goto('/ar/map');
  await say(p, 'وعلى خريطة المملكة ترى عقاراتك', 4200);
  await finish('property', ctx, p);
});

test('video: engineering office', async ({ browser, request }) => {
  test.setTimeout(900_000);
  await warm(browser);
  const stamp = Date.now();
  const officeName = `مكتب الأفق الهندسي ${stamp}`;
  const { ctx, page: p } = await recorder(browser, 'office');
  await landingToOnboarding(p, 'office', 'المكتب الهندسي', `vid-lead-${stamp}@rasikh.test`);
  await verifyEmail(request, `vid-lead-${stamp}@rasikh.test`);

  await say(p, 'سجّل مكتبك: اسمك واسم المكتب', 2400);
  await p.locator('#displayName').fill('م. فيصل');
  await p.locator('#orgName').fill(officeName);
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p.getByTestId('office-workspace')).toBeVisible({ timeout: 45_000 });
  await say(p, 'المكتب بانتظار التوثيق: لا يعتمد شيئاً حتى يوثّقه فريق راسخ', 3400);

  await p.getByRole('tab', { name: 'ملف المكتب' }).click();
  await say(p, 'أدخل بيانات مكتبك: السجل التجاري وتصنيف هيئة المهندسين وتخصصاتك', 3000);
  const profile = p.getByTestId('office-profile');
  await profile.getByLabel('رقم السجل التجاري').fill('1010123456');
  await profile.getByLabel('تصنيف هيئة المهندسين').fill('مكتب استشاري — فئة أ');
  await profile.getByLabel('المكتب مفعّل في بلدي').check();
  await profile.getByLabel('معماري').check();
  await profile.getByLabel('إنشائي').check();
  await profile.getByLabel('المدن التي يخدمها (افصل بفاصلة)').fill('الرياض، الخرج');
  await profile.getByLabel('يستقبل طلبات العملاء').check();
  await p.waitForTimeout(800);
  await profile.getByRole('button', { name: 'احفظ' }).click();
  await expect(profile).toContainText('حُفظ');

  await p.getByRole('tab', { name: 'الفريق' }).click();
  await say(p, 'ثم ملفك كمهندس: رقم عضوية هيئة المهندسين وتخصصك', 2600);
  const box = p.getByTestId('my-engineer-profile');
  await box.getByLabel('الاسم').fill('م. فيصل');
  await box.getByLabel('رقم العضوية').fill('445566');
  await box.getByLabel('التخصص').selectOption('architectural');
  await box.getByLabel('تاريخ انتهاء العضوية').fill('2028-12-31');
  await box.getByRole('button', { name: 'احفظ' }).click();
  await expect(box).toContainText('بانتظار التحقق', { timeout: 20_000 });

  // The Rasikh team verifies the office and the engineer (unrecorded: it is our side of the process).
  await say(p, 'يتحقق فريق راسخ من مكتبك ومهندسيك قبل تفعيل الاعتماد', 1500);
  const team = await plain(browser);
  const teamEmail = `vid-team-${stamp}@rasikh.test`;
  await signUpEmail(team.page, teamEmail);
  await expect(team.page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await grantPlatformAdmin(request, teamEmail);
  await team.page.goto('/ar/admin');
  await team.page.getByRole('tab', { name: 'التحقق من المكاتب' }).click();
  const row = team.page.getByTestId('verify-office').filter({ hasText: officeName });
  await expect(row.getByText('م. فيصل')).toBeVisible({ timeout: 30_000 });
  while ((await row.getByRole('button', { name: 'وثّق' }).count()) > 0) {
    await row.getByRole('button', { name: 'وثّق' }).first().click();
    await team.page.waitForTimeout(500);
  }

  // A client sends a brief in their own words (unrecorded).
  const client = await plain(browser);
  const clientEmail = `vid-client-${stamp}@rasikh.test`;
  await signUpEmail(client.page, clientEmail);
  await expect(client.page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await client.page.goto('/ar/design');
  const form = client.page.getByTestId('brief-form');
  await form.getByLabel(new RegExp(officeName)).check();
  await form.getByLabel('اسم المشروع').fill('فيلا النرجس');
  await form
    .getByLabel('صف ما تريد')
    .fill(
      'فيلا دورين على أرض ٢٢×٣٢، ٤ غرف نوم و٤ دورات مياه، مجلس رجال ومجلس نساء، غرفة خادمة، مصلى، مسبح ومدخل ضيوف مستقل وملحق علوي، طراز نجدي، الميزانية ١٫٥ مليون',
    );
  await form.getByRole('button', { name: 'اقرأ الوصف' }).click();
  await expect(form.getByTestId('program')).toBeVisible();
  await form.getByRole('button', { name: 'أكّد البرنامج وأرسل للمكتب' }).click();
  await expect(form.getByText('أُرسل طلبك إلى المكتب.')).toBeVisible({ timeout: 20_000 });

  await p.reload();
  await expect(p.getByTestId('office-workspace')).toBeVisible({ timeout: 45_000 });
  await p.getByRole('tab', { name: 'المشاريع' }).click();
  await say(p, 'يصلك طلب العميل بوصفه الحر، وراسخ يقرأه ويستخرج البرنامج', 3200);
  await p.getByTestId('office-project').filter({ hasText: 'فيلا النرجس' }).click();
  await expect(p.getByTestId('project-view')).toBeVisible({ timeout: 45_000 });

  const z = p.getByTestId('zoning-form');
  await say(p, 'طبّق اشتراطات وزارة البلديات على القطعة، وأكّد الارتفاع من المخطط المعتمد', 3400);
  await z.getByTestId('regulations').getByRole('button', { name: 'طبّق على القطعة' }).click();
  await z.getByLabel(/أقصى ارتفاع/).fill('14');
  await z.getByLabel('ميكانيكي').uncheck();
  await z.getByLabel('كهربائي').uncheck();
  await p.waitForTimeout(1200);
  await z.getByRole('button', { name: 'اقبل الطلب' }).click();
  await expect(p.getByTestId('project-status')).toHaveText('مقبول', { timeout: 20_000 });

  await p.getByRole('tab', { name: 'الخيارات' }).click();
  await say(p, 'اطلب من المساعد تصاميم مختلفة تحقق كل ما في الوصف', 2600);
  await p.getByRole('button', { name: 'صمّم 8 خيارات' }).click();
  await expect(p.locator('[data-testid^="concept-"]')).toHaveCount(8, { timeout: 60_000 });
  await say(p, 'ثمانية تصاميم مختلفة، كلها تجتاز فحوص الاشتراطات والكود الآلية', 3600);
  await p.getByTestId('compare').scrollIntoViewIfNeeded();
  await say(p, 'قارن بينها: النوع والمساحة والتكلفة والميزانية', 3400);
  const optionA = p.getByTestId('concept-A');
  await optionA.scrollIntoViewIfNeeded();
  await say(p, 'كل خيار يبيّن سبب مطابقته للوصف، وملاحظات تصميمية في أعلى القائمة', 3400);
  await optionA.locator('summary').click();
  await say(p, 'وجدول كميات استرشادي بأسعار قابلة للتعديل', 3600);
  await p.getByRole('button', { name: 'شارك الخيارات مع العميل' }).click();
  await expect(p.getByTestId('project-status')).toHaveText('خيارات مع العميل', { timeout: 20_000 });
  await say(p, 'شارك الخيارات مع العميل ليختار، وكل شيء مسودة حتى يعتمده مهندس مرخّص', 3800);
  await finish('office', ctx, p);
  await Promise.all([team.ctx.close(), client.ctx.close()]);
});

test('video: brokerage', async ({ browser }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const { ctx, page: p } = await recorder(browser, 'broker');
  await landingToOnboarding(
    p,
    'broker',
    'الوساطة العقارية',
    `vid-broker-${Date.now()}@rasikh.test`,
  );

  await say(p, 'اكتب اسمك واسم مكتبك', 2200);
  await p.locator('#displayName').fill('سلمان');
  await p.locator('#orgName').fill('مكتب الأفق العقاري');
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p.getByTestId('broker-view')).toBeVisible({ timeout: 30_000 });

  await say(p, 'أدخل رخصة فال وتاريخ انتهائها، ويذكّرك راسخ قبل انتهائها', 3000);
  await p.locator('#bp-name').fill('سلمان');
  await p.locator('#bp-fal').fill('1234567890');
  await p.locator('#bp-exp').fill(isoIn(20));
  await p.getByRole('button', { name: 'احفظ الملف' }).click();
  await expect(p.getByTestId('fal-state')).toContainText('تنتهي رخصتك خلال', { timeout: 15_000 });

  await say(p, 'أضف عميلاً محتملاً برقم جوال سعودي', 2400);
  await p.locator('#ld-name').fill('خالد');
  await p.locator('#ld-phone').fill('+966512345678');
  await p.getByRole('button', { name: 'أضف عميلاً' }).click();
  await expect(p.getByTestId('lead-row')).toHaveCount(1, { timeout: 20_000 });
  await p.getByRole('button', { name: 'افتح', exact: true }).click();
  await expect(p.getByTestId('lead-detail')).toBeVisible();

  await say(p, 'حرّك العميل في مراحل المبيعات إلى الأمام فقط', 2600);
  await p.getByRole('button', { name: 'انقله إلى تم التواصل' }).click();
  await expect(p.getByTestId('lead-status')).toContainText('تم التواصل', { timeout: 15_000 });

  await say(p, 'حدّد موعد معاينة وسجّل نتيجتها', 2400);
  await p.locator('#vw-place').fill('فيلا النرجس');
  await p.locator('#vw-when').fill('2026-12-01T15:00');
  await p.getByRole('button', { name: 'حدّد معاينة' }).click();
  await expect(p.getByTestId('viewing-row')).toHaveCount(1, { timeout: 15_000 });
  await p.getByRole('button', { name: 'تمت المعاينة' }).click();
  await expect(p.getByTestId('viewing-row')).toContainText('تمت', { timeout: 15_000 });

  await say(p, 'ثم عقد الوساطة وملاحظاتك', 2200);
  await p.locator('#bc-no').fill('BR-2026-001');
  await p.locator('#bc-end').fill(isoIn(365));
  await p.getByRole('button', { name: 'أضف عقد وساطة' }).click();
  await expect(p.getByTestId('contract-row')).toHaveCount(1, { timeout: 15_000 });
  await p.locator('#log-note').fill('اتفقنا على المعاينة مساءً');
  await p.getByRole('button', { name: 'أضف ملاحظة' }).click();
  await expect(p.getByTestId('activity-log').locator('li')).toHaveCount(6, { timeout: 15_000 });
  await p.getByTestId('activity-log').scrollIntoViewIfNeeded();
  await say(p, 'سجل الأنشطة موثّق بالوقت ولا يمكن تعديله أو حذفه', 3600);

  await p.getByRole('button', { name: 'رجوع' }).click();
  await say(p, 'فاحص الإعلان يخبرك بالبيانات الإلزامية الناقصة قبل النشر', 3400);
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
  await say(p, 'عند اكتمال البيانات يصير الإعلان جاهزاً', 3400);
  await finish('broker', ctx, p);
});
