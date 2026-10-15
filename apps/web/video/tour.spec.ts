import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  PASSWORD,
  addPropertyUnitLease,
  onboardOwner,
  signUpEmail,
  tenantJoins,
  verifyEmail,
} from '../e2e/helpers';
import { beat, record, say, scrollTour, snap, title, typeInto } from './lib';

const stamp = Date.now();
const mail = (who: string) => `${who}-${stamp}@rasikh.test`;
const STORAGE = 'http://127.0.0.1:9199';
const BUCKET = 'demo-rasikh.appspot.com';

/** An owner set up off camera: onboarded, with one lease for `tenantEmail`. */
async function backgroundOwner(
  browser: Browser,
  who: string,
  tenantEmail: string,
  property: string,
  unit: string,
  ejarNo: string,
) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await onboardOwner(page, mail(who));
  await addPropertyUnitLease(page, { tenantEmail, property, unit, ejarNo });
  return { ctx, page };
}

test.describe.configure({ mode: 'serial' });

// ----------------------------------------------------------------------------------------- 01 intro
test('scene 01: introduction, landing page and legal pages', async ({ browser }) => {
  test.setTimeout(300_000);
  const s = await record(browser, '01-intro');
  const p = s.page;
  await p.goto('/ar');
  await title(p, 'راسخ', 'عقارك على أرض ثابتة. منصة عربية لإدارة العقار المؤجَّر في السعودية');
  await say(p, 'راسخ يكمّل منصتي إيجار ومُلّاك ولا يغني عنهما', 3200);
  await say(p, 'سجل واحد للعقار: من يوم الاستلام إلى يوم التسليم', 3000);
  await snap(p, 'landing-hero');
  await say(p, 'نمرّ على الصفحة الرئيسية', 1500);
  await scrollTour(p, 6, 560, 1100);
  await snap(p, 'landing-roles');
  await say(p, 'أربعة أدوار رئيسية: مالك، مستأجر، مدير عمارة، ووسيط', 3000);
  await scrollTour(p, 5, 560, 1000);
  await say(p, 'الصفحات القانونية: الخصوصية والشروط وإخلاء المسؤولية', 2400);
  await p.goto('/ar/privacy');
  await beat(p, 2600);
  await snap(p, 'legal-privacy');
  await say(p, 'سياسة الخصوصية وفق نظام حماية البيانات الشخصية (مسودة قيد مراجعة محامٍ)', 3600);
  await scrollTour(p, 3, 480, 900);
  await p.goto('/en');
  await say(p, 'واجهة إنجليزية كاملة بنفس الميزات', 3000);
  await p.goto('/ar/auth');
  await say(p, 'الدخول بالجوال (رمز تحقق) أو بالبريد الإلكتروني', 3200);
  await snap(p, 'auth');
  await s.finish();
});

// ----------------------------------------------------------------------------------------- 02 map
test('scene 02: the 3D map of the portfolio', async ({ browser }) => {
  test.setTimeout(180_000);
  const s = await record(browser, '02-map');
  const p = s.page;
  await p.goto('/ar/portfolio');
  await title(
    p,
    'المحفظة والخريطة ثلاثية الأبعاد',
    'خريطة الرياض بمبانٍ مجسّمة تتبع وقت اليوم، وعقاراتك عليها',
  );
  await beat(p, 6000);
  await snap(p, 'map');
  await say(p, 'كل عقار علامة على الخريطة، وقائمة بحالته: متاح، مؤجر، قيد الاستلام', 3600);
  const card = p
    .getByRole('button')
    .filter({ hasText: /عمارة|برج|مجمع/ })
    .first();
  if (await card.count()) {
    await card.click();
    await say(p, 'اختيار عقار يطير بالكاميرا إليه ويميل الخريطة لعرض المباني', 4200);
  }
  await beat(p, 3000);
  await s.finish();
});

// ----------------------------------------------------------------------------------------- 03 owner
test('scene 03: the owner', async ({ browser }) => {
  test.setTimeout(600_000);
  const s = await record(browser, '03-owner', true);
  const p = s.page;
  await p.goto('/ar/auth');
  await title(p, 'المالك', 'يدير من وحدة إلى خمسين وحدة: عقاراته وعقوده ودفعاته وعماراته');
  await say(p, 'ننشئ حساباً بالبريد وكلمة المرور', 2200);
  await onboardOwner(p, mail('owner'));
  await say(p, 'اختار دور المالك، ووافق على معالجة البيانات، وسمّى مساحة العمل', 3200);
  await snap(p, 'owner-overview');
  await say(p, 'هذه مساحة العمل: نظرة عامة على الوحدات والعقود والدفعات والتنبيهات', 3600);

  await say(p, 'نضيف عقاراً ثم وحدة ثم عقد إيجار برقم عقد إيجار', 2000);
  await addPropertyUnitLease(p, {
    tenantEmail: mail('tenant-demo'),
    property: 'برج النخيل',
    unit: 'شقة 12',
    ejarNo: '10203040',
  });
  await snap(p, 'owner-lease');
  await say(p, 'يُولَّد جدول الدفعات تلقائياً مع تذكيرات مجانية وتصدير للتقويم', 3600);
  await p.mouse.wheel(0, 500);
  await beat(p, 2200);

  await say(p, 'سجل العقار: خط زمني لكل ما جرى على الوحدة', 2000);
  await p.getByRole('tab', { name: 'سجل العقار' }).click();
  await beat(p, 2600);
  await snap(p, 'owner-record');

  await say(p, 'العمارات والجمعيات: مصاريف مشتركة بإيصالاتها وأرصدة تظهر لكل مالك', 2600);
  await p.getByRole('tab', { name: 'العمارات والجمعيات' }).click();
  await p.getByLabel('اسم العمارة').fill('عمارة الواحة');
  await p.getByRole('button', { name: 'أضف عمارة' }).click();
  await expect(p.getByTestId('building-board')).toBeVisible({ timeout: 20_000 });
  await p.getByLabel('اسم المالك', { exact: true }).first().fill('سالم');
  await p.getByLabel('الوحدة', { exact: true }).fill('1');
  await p.getByLabel('النصيب من المصاريف (%)').fill('60');
  await p.getByRole('button', { name: 'أضف مالكاً' }).click();
  await expect(p.locator('#bm-name')).toHaveValue('');
  await p.getByLabel('اسم المالك', { exact: true }).first().fill('نورة');
  await p.getByLabel('الوحدة', { exact: true }).fill('2');
  await p.getByLabel('النصيب من المصاريف (%)').fill('40');
  await p.getByRole('button', { name: 'أضف مالكاً' }).click();
  await expect(p.getByTestId('member-row')).toHaveCount(2, { timeout: 20_000 });
  await p.getByLabel('البيان').fill('صيانة المصعد');
  await p.getByLabel('المبلغ (ر.س)', { exact: true }).first().fill('1000');
  await say(p, 'كل مصروف مشترك يلزمه إيصال، ولا يمكن تعديله بعد تسجيله', 2600);
  await p.locator('#be-receipt').setInputFiles({
    name: 'receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await p.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(p.getByTestId('bexpense-row')).toHaveCount(1, { timeout: 20_000 });
  await snap(p, 'owner-building');
  await say(p, 'يُقسَّم المبلغ على الملاك بحسب أنصبتهم بدقة الهللة', 3200);

  await say(p, 'المصروفات والتقرير السنوي', 1800);
  await p.getByRole('tab', { name: 'التقرير السنوي' }).click();
  await beat(p, 2800);

  await say(p, 'المساعد: يجيب من سجلاتك أنت فقط، وإجاباته موسومة وليست قرارات', 2800);
  await p.getByRole('tab', { name: 'المساعد' }).click();
  await typeInto(p.locator('#ai-q'), 'كم عقداً عندي وهل في دفعات متأخرة؟', 45);
  await p.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(p.getByTestId('ai-answer')).toBeVisible({ timeout: 30_000 });
  await snap(p, 'owner-assistant');
  await say(p, 'الإجابة عليها شارة "مُولَّد بالذكاء الاصطناعي، راجعه قبل الاعتماد"', 3400);
  await p.locator('#ai-q').fill('اكتب لي قصيدة عن الحب');
  await p.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(p.getByTestId('ai-refused')).toBeVisible({ timeout: 30_000 });
  await say(p, 'الأسئلة خارج نطاق العقار تُرفض برسالة مهذبة قبل أي نموذج', 3400);

  await say(p, 'خصوصيتي: نزّل بياناتك أو احذف حسابك وفق نظام حماية البيانات', 2200);
  await p.getByRole('tab', { name: 'خصوصيتي' }).click();
  await beat(p, 2600);
  await snap(p, 'owner-privacy');
  await s.finish();
});

// ----------------------------------------------------------------------------------------- 04 tenant
test('scene 04: the tenant', async ({ browser, request }) => {
  test.setTimeout(600_000);
  const tenantEmail = mail('tenant');
  const bg = await backgroundOwner(
    browser,
    'owner-t',
    tenantEmail,
    'برج الصيانة',
    'شقة 7',
    'MNT-2026-01',
  );

  const s = await record(browser, '04-tenant');
  const p = s.page;
  await p.goto('/ar/auth');
  await title(p, 'المستأجر', 'يرى عقده ودفعاته، ويوثّق حالة الوحدة، ويرفع طلبات الصيانة بالصور');
  await say(p, 'المالك دعاه ببريده. يسجّل بنفس البريد ويؤكده فيرتبط عقده تلقائياً', 3000);
  await tenantJoins(p, request, tenantEmail);
  await snap(p, 'tenant-lease');
  await say(p, 'يرى عقده وجدول دفعاته وتنبيهاته، ويضيفها لتقويم جواله', 3600);
  await p.mouse.wheel(0, 480);
  await beat(p, 2000);

  await say(p, 'يفتح بلاغ صيانة بصورة وتصنيف وأولوية', 2400);
  await typeInto(p.getByLabel('عنوان البلاغ'), 'تسريب تحت المغسلة', 45);
  await p.getByLabel('التصنيف').selectOption('plumbing');
  await p.getByLabel('الأولوية').selectOption('urgent');
  await p.locator('#tk-photo').setInputFiles({
    name: 'leak.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([255, 216, 255, 224, 0, 16]),
  });
  await p.getByRole('button', { name: 'أرسل البلاغ' }).click();
  await expect(p.getByTestId('ticket-detail')).toBeVisible({ timeout: 30_000 });
  await snap(p, 'tenant-ticket');
  await say(p, 'يقترح النظام المسؤولية (على المالك هنا) ومهلة الإنجاز، والقرار للطرفين', 3800);

  // the owner assigns and resolves, off camera
  await bg.page.reload();
  await bg.page.getByRole('tab', { name: 'الصيانة' }).click();
  await bg.page.getByTestId('ticket-row').click();
  await bg.page.getByLabel('جهة التنفيذ', { exact: true }).fill('مؤسسة السباكة');
  await bg.page.getByRole('button', { name: 'أسند' }).click();
  await expect(bg.page.getByTestId('status')).toContainText('مؤسسة السباكة', { timeout: 20_000 });
  await bg.page.getByRole('button', { name: 'بدأ التنفيذ' }).click();
  await expect(bg.page.getByTestId('status')).toContainText('قيد التنفيذ', { timeout: 20_000 });
  await bg.page.getByLabel('ملاحظة الإصلاح').fill('تم تبديل الوصلة');
  await bg.page.getByRole('button', { name: 'تم الإصلاح' }).click();
  await expect(bg.page.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });

  await say(p, 'المالك أسند الطلب وأنجزه، والمستأجر يرى الحالة مباشرة', 2600);
  await expect(p.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 30_000 });
  await say(p, 'يغلق الطلب ويقيّم الإنجاز', 2000);
  await p.getByLabel('التقييم (من 5)').selectOption('4');
  await p.getByRole('button', { name: 'أغلق وقيّم' }).click();
  await expect(p.getByTestId('status')).toContainText('مغلق', { timeout: 20_000 });
  await snap(p, 'tenant-closed');
  await beat(p, 2400);

  await say(p, 'يستطيع أن يطلب من المساعد شرح عقده بكلمات بسيطة', 2400);
  await p.goto('/ar/workspace');
  await p.getByRole('button', { name: 'اشرح هذا العقد' }).scrollIntoViewIfNeeded();
  await p.getByRole('button', { name: 'اشرح هذا العقد' }).click();
  await expect(p.getByTestId('ai-answer').last()).toBeVisible({ timeout: 30_000 });
  await snap(p, 'tenant-explain-lease');
  await say(p, 'يعرض التواريخ والمبالغ وموعد إشعار التجديد، ولا يعطي رأياً قانونياً', 3600);
  await s.finish();
  await bg.ctx.close();
});

// ----------------------------------------------------------------------------------------- 05 vendor
test('scene 05: the vendor', async ({ browser, request }) => {
  test.setTimeout(600_000);
  const vendorEmail = mail('vendor');
  const s = await record(browser, '05-vendor');
  const p = s.page;
  await p.goto('/ar/auth');
  await title(p, 'الفنّي / المقاول', 'يستلم الأعمال المسندة إليه فقط، وينفّذها ويسجّل الإصلاح');
  await say(p, 'الفنّي يسجّل ببريده ويؤكده', 2200);
  await signUpEmail(p, vendorEmail);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await verifyEmail(request, vendorEmail);

  // the owner opens a ticket and assigns it to this vendor's email, off camera
  const ctx = await browser.newContext();
  const o = await ctx.newPage();
  await onboardOwner(o, mail('owner-v'));
  await addPropertyUnitLease(o, {
    tenantEmail: mail('nobody'),
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

  await say(p, 'المالك أسند إليه بلاغاً ببريده، فيرتبط حسابه عند الدخول', 2800);
  await p.goto('/ar/workspace');
  await expect(p.getByText('البلاغات المسندة إليّ')).toBeVisible({ timeout: 30_000 });
  await snap(p, 'vendor-assigned');
  await say(p, 'يرى البلاغات المسندة إليه فقط، ولا يستطيع فتح بلاغات جديدة', 3600);
  await p.getByTestId('ticket-row').click();
  await say(p, 'يبدأ التنفيذ ثم يسجّل ما أنجزه', 2200);
  await p.getByRole('button', { name: 'بدأ التنفيذ' }).click();
  await expect(p.getByTestId('status')).toContainText('قيد التنفيذ', { timeout: 20_000 });
  await typeInto(p.getByLabel('ملاحظة الإصلاح'), 'تم تنظيف الوحدة وتعبئة الغاز', 40);
  await p.getByRole('button', { name: 'تم الإصلاح' }).click();
  await expect(p.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });
  await snap(p, 'vendor-resolved');
  await say(p, 'لا يستطيع إغلاق الطلب: الإغلاق والتقييم للمالك أو المستأجر', 3400);
  await s.finish();
  await ctx.close();
});

// ----------------------------------------------------------------------------------------- 06 unit owner
test('scene 06: the owner of a unit in a building', async ({ browser, request }) => {
  test.setTimeout(600_000);
  const unitEmail = mail('unit');
  const s = await record(browser, '06-unit-owner');
  const p = s.page;
  await p.goto('/ar/auth');
  await title(
    p,
    'مالك وحدة في عمارة',
    'يرى حسابات العمارة وأرصدة الملاك، ويصوّت على القرارات لوحدته',
  );
  await say(p, 'مالك الوحدة يسجّل ببريده ويؤكده', 2200);
  await signUpEmail(p, unitEmail);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await verifyEmail(request, unitEmail);

  const ctx = await browser.newContext();
  const o = await ctx.newPage();
  await onboardOwner(o, mail('owner-b'));
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
  await o.locator('#be-receipt').setInputFiles({
    name: 'r.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByTestId('bexpense-row')).toHaveCount(1, { timeout: 20_000 });
  await o.getByLabel('موضوع التصويت').fill('اعتماد الميزانية');
  await o.getByRole('button', { name: 'أنشئ تصويتاً' }).click();
  await expect(o.getByTestId('vote-box')).toBeVisible({ timeout: 20_000 });
  await o.getByLabel('بريد المالك').fill(unitEmail);
  await o.getByRole('button', { name: 'اربط بحساب' }).click();
  await expect(o.getByTestId('member-row')).toContainText('مرتبط بحساب', { timeout: 20_000 });

  await say(p, 'مدير العمارة ربط حسابه بوحدته عبر البريد', 2600);
  await p.goto('/ar/workspace');
  await expect(p.getByTestId('owner-building')).toBeVisible({ timeout: 30_000 });
  await snap(p, 'unit-owner-building');
  await say(p, 'يرى مصاريف العمارة بإيصالاتها ورصيده، وتنبيهاً مجانياً بما عليه', 3800);
  await say(p, 'ويصوّت لوحدته على القرار: صوت واحد لكل وحدة', 2400);
  await p.getByRole('button', { name: 'موافق', exact: true }).click();
  await expect(p.getByTestId('vote-result')).toContainText('أُقرّ', { timeout: 20_000 });
  await snap(p, 'unit-owner-vote');
  await say(p, 'يظهر الإقرار للجميع، ولا يمكن تعديل الصوت بعد تسجيله', 3600);
  await s.finish();
  await ctx.close();
});

// ----------------------------------------------------------------------------------------- 07 broker
test('scene 07: the broker', async ({ browser }) => {
  test.setTimeout(600_000);
  const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
  const s = await record(browser, '07-broker');
  const p = s.page;
  await p.goto('/ar/auth');
  await title(
    p,
    'الوسيط العقاري',
    'عملاؤه ومعايناته وعقوده في سجل لا يُعدَّل، وفحص لبيانات الإعلان',
  );
  await signUpEmail(p, mail('broker'));
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await p.getByText('وسيط', { exact: true }).click();
  await p.locator('#displayName').fill('سلمان');
  await p.locator('#orgName').fill('مكتب الأفق');
  await p.locator('input[type=checkbox]').last().check();
  await say(p, 'يختار دور الوسيط ويُنشئ مساحته', 2200);
  await p.locator('main button').last().click();
  await expect(p.getByTestId('broker-view')).toBeVisible({ timeout: 45_000 });

  await say(p, 'ملف الوسيط: رقم رخصة فال مع تنبيه قبل الانتهاء بـ 60 و30 و7 أيام', 2400);
  await p.locator('#bp-name').fill('سلمان');
  await p.locator('#bp-fal').fill('1234567890');
  await p.locator('#bp-exp').fill(iso(20));
  await p.getByRole('button', { name: 'احفظ الملف' }).click();
  await expect(p.getByTestId('fal-state')).toContainText('تنتهي رخصتك خلال', { timeout: 15_000 });
  await snap(p, 'broker-profile');
  await say(p, 'الرخصة تنتهي خلال 20 يوماً: يظهر التنبيه فوراً', 3000);

  await say(p, 'يضيف عميلاً محتملاً', 1800);
  await typeInto(p.locator('#ld-name'), 'خالد', 60);
  await p.locator('#ld-phone').fill('+966512345678');
  await p.getByRole('button', { name: 'أضف عميلاً' }).click();
  await expect(p.getByTestId('lead-row')).toHaveCount(1, { timeout: 20_000 });
  await p.getByRole('button', { name: 'افتح' }).click();
  await expect(p.getByTestId('lead-detail')).toBeVisible();
  await say(p, 'يحرّك العميل في مراحل البيع: للأمام فقط، أو إلى "خسرناه"', 3000);
  await p.getByRole('button', { name: 'انقله إلى تم التواصل' }).click();
  await expect(p.getByTestId('lead-status')).toContainText('تم التواصل', { timeout: 15_000 });

  await p.locator('#vw-place').fill('فيلا النرجس');
  await p.locator('#vw-when').fill('2026-12-01T15:00');
  await p.getByRole('button', { name: 'حدّد معاينة' }).click();
  await expect(p.getByTestId('viewing-row')).toHaveCount(1, { timeout: 15_000 });
  await p.getByRole('button', { name: 'تمت المعاينة' }).click();
  await p.locator('#bc-no').fill('BR-2026-001');
  await p.locator('#bc-end').fill(iso(365));
  await p.getByRole('button', { name: 'أضف عقد وساطة' }).click();
  await expect(p.getByTestId('contract-row')).toHaveCount(1, { timeout: 15_000 });
  await p.locator('#log-note').fill('اتفقنا على المعاينة مساءً');
  await p.getByRole('button', { name: 'أضف ملاحظة' }).click();
  await expect(p.getByTestId('activity-log').locator('li')).toHaveCount(6, { timeout: 15_000 });
  await snap(p, 'broker-lead-log');
  await say(p, 'سجل الأنشطة يختمه الخادم بالوقت، ولا يمكن تعديله أو حذفه أبداً', 3800);
  await p.getByRole('button', { name: 'رجوع' }).click();

  await say(p, 'فاحص الإعلان: يبيّن ما ينقص من البيانات الإلزامية قبل النشر', 2600);
  await p.getByTestId('ad-checker').scrollIntoViewIfNeeded();
  await beat(p, 1800);
  await snap(p, 'broker-ad-empty');
  await p.locator('#ad-purpose').selectOption({ label: 'إيجار' });
  await p.locator('#ad-adv').fill('مكتب الأفق العقاري');
  await p.locator('#ad-cap').selectOption({ label: 'وسيط' });
  await p.locator('#ad-lic').fill('1234567890');
  await p.locator('#ad-exp').fill(iso(400));
  await p.locator('#ad-city').fill('الرياض');
  await p.locator('#ad-dist').fill('حي النرجس');
  await p.locator('#ad-type').fill('شقة');
  await p.locator('#ad-area').fill('140');
  await p.locator('#ad-price').fill('48000');
  await p.locator('#ad-phone').fill('+966512345678');
  await p.locator('#ad-enc').selectOption({ label: 'لا يوجد' });
  await p.locator('#ad-desc').fill('شقة من ثلاث غرف في الدور الثاني، قريبة من الخدمات والمدارس.');
  await expect(p.getByTestId('ad-verdict')).toContainText('بيانات الإعلان مكتملة');
  await snap(p, 'broker-ad-ready');
  await say(p, 'عند اكتمال البيانات يظهر الحكم، وراسخ لا ينشر الإعلان ولا يعتمده', 3600);
  await s.finish();
});

// ----------------------------------------------------------------------------------------- 08 inspection
test('scene 08: the guided inspection with signed evidence', async ({ browser, request }) => {
  test.setTimeout(900_000);
  const tenantEmail = mail('tenant-i');
  const s = await record(browser, '08-inspection', true);
  const p = s.page;
  await p.goto('/ar/auth');
  await title(
    p,
    'الفحص الموجَّه',
    'صور موثّقة بالوقت والموقع والبصمة الرقمية، وتوقيع الطرفين، ثم قفل السجل',
  );
  await onboardOwner(p, mail('owner-i'));
  await addPropertyUnitLease(p, {
    tenantEmail,
    property: 'برج الفحص',
    unit: 'شقة 5',
    ejarNo: 'INSP-2026-01',
  });
  await say(p, 'المالك يبدأ فحص استلام لهذا العقد', 2200);
  await p.getByRole('tab', { name: 'الفحوصات' }).click();
  await p.getByLabel('العقد', { exact: true }).selectOption({ index: 1 });
  await p.getByLabel('عدد غرف النوم').fill('1');
  await p.getByRole('button', { name: 'ابدأ فحصاً' }).click();
  await expect(p.getByTestId('inspection-editor')).toBeVisible();
  await snap(p, 'inspection-start');
  await say(p, 'غرفة بغرفة: 48 بنداً، والتوقيع مقفل حتى يُجاب عن كل بند', 3400);

  const ROOMS = ['entrance', 'living', 'bedroom_1', 'kitchen', 'bathroom_1', 'balcony', 'meters'];
  for (const key of ROOMS) {
    const d = p.getByTestId(`room-${key}`);
    if (!(await d.evaluate((el) => (el as HTMLDetailsElement).open)))
      await d.locator('summary').click();
    await d.getByRole('button', { name: 'كل بنود الغرفة سليمة' }).click();
    await beat(p, 450);
  }
  await expect(p.getByTestId('progress')).toContainText('48 من 48');
  await say(p, 'اكتملت البنود. بند واحد فيه عيب يحتاج صورة بكاميرا التطبيق فقط', 3000);
  const living = p.getByTestId('room-living');
  await living.getByLabel('الحالة').first().selectOption('damaged');
  const item = p.getByTestId('item-living__walls');
  await item.getByTestId('camera-open').click();
  const shutter = p.getByTestId('camera-shutter');
  await expect(shutter).toBeEnabled({ timeout: 15_000 });
  await beat(p, 1200);
  await shutter.click();
  await expect(item.getByTestId('evidence')).toHaveCount(1, { timeout: 30_000 });
  await item.scrollIntoViewIfNeeded();
  await snap(p, 'inspection-evidence');
  const evidence = item.getByTestId('evidence');
  await say(p, 'تُسجَّل البصمة SHA-256 ووقت الالتقاط والموقع لحظة التصوير', 3600);
  await evidence.getByTestId('verify-evidence').click();
  await expect(evidence.getByTestId('verify-result')).toContainText('مطابق');
  await say(p, 'زر "تحقق" يعيد حساب البصمة: الملف مطابق', 2800);

  // tamper with the stored file behind the app's back, then try to sign
  const src = (await evidence.locator('img').getAttribute('src'))!;
  const objectName = decodeURIComponent(src.split('/o/')[1]!.split('?')[0]!);
  const original = await (await request.get(src)).body();
  const forged = Buffer.from(original);
  forged[forged.length - 20] = (forged[forged.length - 20]! ^ 0xff) & 0xff;
  const put = (bytes: Buffer) =>
    request.post(`${STORAGE}/upload/storage/v1/b/${BUCKET}/o`, {
      params: { uploadType: 'media', name: objectName },
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'image/jpeg' },
      data: bytes,
    });
  await put(forged);
  await say(p, 'لنجرّب التلاعب: غيّرنا بايتاً واحداً في الصورة خلف التطبيق', 2800);
  await p.getByTestId('sign-owner').click();
  await p.locator('#sign-password').fill(PASSWORD);
  await p.getByTestId('sign-confirm').click();
  await expect(p.getByRole('alert')).toContainText('تغيّر أحد الملفات', { timeout: 30_000 });
  await snap(p, 'inspection-tamper');
  await say(p, 'التوقيع مرفوض: الخادم اكتشف أن الملف تغيّر', 3600);
  await p.keyboard.press('Escape');
  await put(original);
  await say(p, 'نعيد الملف الأصلي، فيمرّ التوقيع (ويُطلب كلمة المرور مجدداً)', 2600);
  await p.getByTestId('sign-owner').click();
  await p.locator('#sign-password').fill(PASSWORD);
  await p.getByTestId('sign-confirm').click();
  await expect(p.getByTestId('signed-owner')).toContainText('وقّع', { timeout: 30_000 });
  await snap(p, 'inspection-owner-signed');
  await say(p, 'وقّع المالك، والسجل بانتظار توقيع المستأجر', 2800);

  // the tenant signs, off camera
  const tctx = await browser.newContext();
  const t = await tctx.newPage();
  await tenantJoins(t, request, tenantEmail);
  await t.getByTestId('inspection-move_in').click();
  await t.getByLabel('ملاحظات المستأجر').fill('أوافق مع ملاحظة الجدار');
  await t.getByRole('button', { name: 'احفظ الملاحظة' }).click();
  await expect(t.getByText('تم الحفظ.')).toBeVisible();
  await t.getByTestId('sign-tenant').click();
  await t.locator('#sign-password').fill(PASSWORD);
  await t.getByTestId('sign-confirm').click();
  await expect(t.getByTestId('sign-panel')).toContainText('موثّق ومقفل', { timeout: 30_000 });

  await say(p, 'المستأجر راجع ووقّع، فقُفل السجل ببصمة واحدة للمحتوى', 2600);
  await p.reload();
  await p.getByRole('tab', { name: 'الفحوصات' }).click();
  await p.getByTestId('inspection-move_in').click();
  await expect(p.getByTestId('sealed-note')).toContainText('بصمة المحتوى');
  await p.getByTestId('sealed-note').scrollIntoViewIfNeeded();
  await snap(p, 'inspection-sealed');
  await say(p, 'سجل موثّق ومقفل: لا يُعدَّل، وجاهز للإرفاق مع نموذج التسليم في إيجار', 4200);
  await s.finish();
  await tctx.close();
});

// ----------------------------------------------------------------------------------------- 09 closing
test('scene 09: closing', async ({ browser }) => {
  test.setTimeout(120_000);
  const s = await record(browser, '09-closing');
  const p = s.page;
  await p.goto('/ar');
  await title(
    p,
    'راسخ · عقارك على أرض ثابتة',
    'مالك، مستأجر، فنّي، مدير عمارة، ووسيط: في سجل واحد للعقار<br/>يكمّل إيجار ومُلّاك ولا يغني عنهما',
    6500,
  );
  await s.finish();
});

export type { Page };
