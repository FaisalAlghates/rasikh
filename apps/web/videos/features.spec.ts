import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { addPropertyUnitLease, onboardOwner, tenantJoins } from '../e2e/helpers';
import { CAPTION_SCRIPT, SIZE, finish, plain, say, warm } from './support';

/**
 * One short video per feature (leases and payments, maintenance, buildings, inspections, the assistant, the Kingdom
 * map, the four design styles in 3D). Each is set up unrecorded and the camera starts inside the feature, signed in
 * through the saved browser state. Run on demand with `pnpm videos`.
 */
async function recordFrom(browser: Browser, from: BrowserContext, name: string) {
  const state = await from.storageState({ indexedDB: true });
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: `test-results/videos/${name}`, size: SIZE },
    storageState: state,
  });
  await ctx.addInitScript(CAPTION_SCRIPT);
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept());
  return { ctx, page };
}

async function recordPublic(browser: Browser, name: string) {
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
  return { ctx, page };
}

/** An owner with a property, a unit and a lease, set up unrecorded. */
async function ownerWithLease(browser: Browser, prefix: string, tenantEmail: string) {
  const o = await plain(browser);
  await onboardOwner(o.page, `${prefix}-owner-${Date.now()}@rasikh.test`);
  await addPropertyUnitLease(o.page, {
    tenantEmail,
    property: 'برج النرجس',
    unit: 'شقة 5',
    ejarNo: '55667788',
  });
  return o;
}

test.describe.configure({ mode: 'serial' });

test('video: leases and payments', async ({ browser }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const setup = await plain(browser);
  await onboardOwner(setup.page, `vl-owner-${Date.now()}@rasikh.test`);
  const { ctx, page: o } = await recordFrom(browser, setup.ctx, 'leases');
  await o.goto('/ar/workspace');
  await expect(o.getByRole('tab', { name: 'العقارات والوحدات' })).toBeVisible({ timeout: 45_000 });
  await say(o, 'العقود والدفعات: من العقار إلى جدول الدفعات في دقائق', 3000);
  await o.getByRole('tab', { name: 'العقارات والوحدات' }).click();
  await say(o, 'أضف العقار', 1800);
  await o.getByLabel('الاسم', { exact: true }).fill('عمارة النرجس');
  await o.getByRole('button', { name: 'أضف عقاراً' }).click();
  await expect(o.getByTestId('property-عمارة النرجس')).toBeVisible();
  await say(o, 'ثم الوحدة', 1800);
  await o.getByLabel('رقم أو اسم الوحدة').fill('شقة 3');
  await o.getByRole('button', { name: 'أضف وحدة' }).last().click();
  await expect(o.getByTestId('unit-شقة 3')).toBeVisible();
  await say(o, 'سجّل العقد برقم عقد إيجار ومدته وإيجاره', 2800);
  await o.getByRole('button', { name: 'أضف عقداً' }).click();
  await o.getByLabel('رقم عقد إيجار').fill('10203040');
  await o.getByLabel('اسم المستأجر').fill('سالم');
  await o.getByLabel('بريد المستأجر (للدعوة)').fill(`vl-tenant-${Date.now()}@rasikh.test`);
  await o.getByLabel('بداية العقد').fill('2026-01-01');
  await o.getByLabel('نهاية العقد').fill('2027-01-01');
  await o.getByLabel('الإيجار السنوي (ر.س)').fill('42000');
  await o.getByLabel('الإيجار السابق (عند التجديد)').fill('40000');
  await say(
    o,
    'في الرياض: رفع الإيجار في التجديد خلال فترة التجميد يظهر تحذيراً، ولا يمنع الحفظ',
    3800,
  );
  await o.getByRole('button', { name: 'احفظ العقد وأنشئ الجدول' }).click();
  await expect(o.getByTestId('lease-detail')).toBeVisible({ timeout: 30_000 });
  await say(o, 'تُنشأ جدولة اثنتي عشرة دفعة تلقائياً', 3000);
  await o.getByTestId('pay-2026-01-01').getByRole('button', { name: 'سجّل الدفع' }).click();
  await expect(o.getByTestId('pay-2026-01-01')).toContainText('مدفوعة');
  await say(o, 'سجّل كل دفعة عند استلامها؛ راسخ يسجّل ولا يحصّل المال', 3400);
  await o.getByRole('tab', { name: 'المصروفات' }).click();
  await say(o, 'ثم المصروفات', 1800);
  await o.getByLabel('المبلغ', { exact: true }).fill('500');
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByTestId('expense-row')).toHaveCount(1);
  await o.getByRole('tab', { name: 'التقرير السنوي' }).click();
  await expect(o.getByTestId('total-net')).toBeVisible();
  await say(o, 'التقرير السنوي: المحصّل والمصروفات والصافي', 3600);
  await o.getByRole('tab', { name: 'نظرة عامة' }).click();
  await say(o, 'وفي نظرة عامة تنبيهات الدفعات المتأخرة والقريبة والتجديد', 3600);
  await finish('leases', ctx, o);
  await setup.ctx.close();
});

test('video: maintenance', async ({ browser, request }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const stamp = Date.now();
  const tenantEmail = `vm-tenant-${stamp}@rasikh.test`;
  const owner = await ownerWithLease(browser, 'vm', tenantEmail);
  const tenant = await plain(browser);
  await tenantJoins(tenant.page, request, tenantEmail);
  const { ctx, page: t } = await recordFrom(browser, tenant.ctx, 'maintenance');
  await t.goto('/ar/workspace');
  await expect(t.getByLabel('عنوان البلاغ')).toBeVisible({ timeout: 45_000 });
  await say(t, 'الصيانة: يرفع المستأجر بلاغاً بالصور من حسابه', 3000);
  await t.getByLabel('عنوان البلاغ').fill('تسريب تحت المغسلة');
  await t.getByLabel('التصنيف').selectOption('plumbing');
  await t.getByLabel('الأولوية').selectOption('urgent');
  await t.locator('#tk-photo').setInputFiles({
    name: 'leak.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([255, 216, 255, 224, 0, 16]),
  });
  await say(t, 'اختر التصنيف والأولوية وأرفق صورة', 2600);
  await t.getByRole('button', { name: 'أرسل البلاغ' }).click();
  await expect(t.getByTestId('ticket-detail')).toBeVisible({ timeout: 30_000 });
  await say(t, 'راسخ يقترح من يتحمل التكلفة بحسب إرشاد إيجار، ويبدأ عدّاد مدة المعالجة', 4000);

  // the owner assigns, starts and resolves (unrecorded)
  const o = owner.page;
  await o.reload();
  await o.getByRole('tab', { name: 'الصيانة' }).click();
  await o.getByTestId('ticket-row').click();
  await o.getByLabel('جهة التنفيذ', { exact: true }).fill('مؤسسة السباكة');
  await o.getByRole('button', { name: 'أسند' }).click();
  await expect(o.getByTestId('status')).toContainText('مؤسسة السباكة', { timeout: 20_000 });
  await o.getByRole('button', { name: 'بدأ التنفيذ' }).click();
  await expect(o.getByTestId('status')).toContainText('قيد التنفيذ', { timeout: 20_000 });
  await say(t, 'المالك يسند الفني ويتابع التنفيذ…', 2600);
  await o.getByLabel('ملاحظة الإصلاح').fill('تم تبديل الوصلة');
  await o.getByRole('button', { name: 'تم الإصلاح' }).click();
  await expect(o.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });

  await expect(t.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 30_000 });
  await say(t, 'بعد الإصلاح يراجع المستأجر ويقيّم', 2600);
  await t.getByLabel('التقييم (من 5)').selectOption('4');
  await t.getByRole('button', { name: 'أغلق وقيّم' }).click();
  await expect(t.getByTestId('status')).toContainText('مغلق', { timeout: 20_000 });
  await say(t, 'ويُغلق البلاغ ويبقى في سجل العقار', 3000);
  await finish('maintenance', ctx, t);
  await Promise.all([owner.ctx.close(), tenant.ctx.close()]);
});

test('video: buildings and owners associations', async ({ browser }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const setup = await plain(browser);
  await onboardOwner(setup.page, `vb-owner-${Date.now()}@rasikh.test`);
  const { ctx, page: o } = await recordFrom(browser, setup.ctx, 'buildings');
  await o.goto('/ar/workspace');
  await o.getByRole('tab', { name: 'العمارات والجمعيات' }).click();
  await say(o, 'العمائر واتحادات الملاك: مصاريف بإيصالاتها وأرصدة يراها الجميع', 3400);
  await o.getByLabel('اسم العمارة').fill('عمارة الجمعية');
  await o.getByRole('button', { name: 'أضف عمارة' }).click();
  await expect(o.getByTestId('building-board')).toBeVisible({ timeout: 20_000 });
  const addMember = async (name: string, unit: string, share: string) => {
    await o.getByLabel('اسم المالك', { exact: true }).first().fill(name);
    await o.getByLabel('الوحدة', { exact: true }).fill(unit);
    await o.getByLabel('النصيب من المصاريف (%)').fill(share);
    await o.getByRole('button', { name: 'أضف مالكاً' }).click();
    await expect(o.locator('#bm-name')).toHaveValue('');
  };
  await say(o, 'أضف الملاك ونصيب كل وحدة من المصاريف', 2600);
  await addMember('سالم', '1', '60');
  await addMember('نورة', '2', '40');
  await say(o, 'لا يُقبل مصروف بلا إيصال', 2600);
  await o.getByLabel('البيان').fill('صيانة المصعد');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).first().fill('1000');
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByText('أرفق إيصال المصروف.')).toBeVisible();
  await o
    .locator('#be-receipt')
    .setInputFiles({ name: 'r.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByTestId('bexpense-row')).toHaveCount(1, { timeout: 20_000 });
  await say(o, 'ثم يُقسَّم على الملاك بنسبهم ويظهر المستحق لكل وحدة', 3600);
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).nth(1).fill('250');
  await o.locator('#bc-member').selectOption({ label: 'سالم · 1' });
  await o.getByRole('button', { name: 'سجّل دفعة' }).click();
  await expect(o.getByTestId('balance-1')).toContainText('المتبقي 350', { timeout: 20_000 });
  await say(o, 'وكل دفعة تُسجَّل فيتحدث الرصيد', 2800);
  await o.getByLabel('العرض لأجل').fill('طلاء الواجهة');
  await o.getByLabel('المورّد').fill('شركة أ');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).nth(2).fill('5200');
  await o.getByRole('button', { name: 'أضف عرضاً' }).click();
  await o.getByLabel('المورّد').fill('شركة ب');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).nth(2).fill('4800');
  await o.getByRole('button', { name: 'أضف عرضاً' }).click();
  await expect(o.getByTestId('quote-cheapest')).toContainText('شركة ب', { timeout: 20_000 });
  await say(o, 'قارن عروض الموردين: الأرخص أولاً', 3200);
  await o.getByLabel('موضوع التصويت').fill('اعتماد عرض الطلاء');
  await o.getByRole('button', { name: 'أنشئ تصويتاً' }).click();
  await expect(o.getByTestId('vote-box')).toBeVisible({ timeout: 20_000 });
  await o.getByTestId('vote-box').getByRole('button', { name: 'موافق', exact: true }).click();
  await o.getByTestId('vote-box').getByRole('button', { name: 'موافق', exact: true }).click();
  await expect(o.getByTestId('vote-result')).toContainText('أُقرّ', { timeout: 20_000 });
  await say(o, 'ثم التصويت على القرار بأصوات الوحدات', 3200);
  await o.getByTestId('stmt-net').scrollIntoViewIfNeeded();
  await say(o, 'ويُختم الشهر بكشف حساب واضح', 3400);
  await finish('buildings', ctx, o);
  await setup.ctx.close();
});

test('video: the assistant', async ({ browser }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const owner = await ownerWithLease(browser, 'va', `va-tenant-${Date.now()}@rasikh.test`);
  const { ctx, page: o } = await recordFrom(browser, owner.ctx, 'assistant');
  await o.goto('/ar/workspace');
  await o.getByRole('tab', { name: 'المساعد' }).click();
  await expect(o.getByTestId('assistant-panel')).toBeVisible({ timeout: 45_000 });
  await say(o, 'المساعد العقاري: يجيب عن عقاراتك من سجلاتك فقط', 3000);
  await o.locator('#ai-q').fill('كم عقداً عندي وهل في دفعات متأخرة؟');
  await o.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(o.getByTestId('ai-answer')).toBeVisible({ timeout: 30_000 });
  await say(o, 'كل إجابة موسومة بالذكاء الاصطناعي لتراجعها قبل الاعتماد', 3600);
  await o.locator('#ai-q').fill('من المسؤول عن صيانة تسرب في الشقة؟');
  await o.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(o.getByTestId('ai-answer')).toContainText('المستهلكات', { timeout: 30_000 });
  await say(o, 'وأسئلة الإجراءات يجيب عنها من قاعدة معرفة راسخ', 3400);
  await o.locator('#ai-q').fill('اكتب لي قصيدة عن الحب');
  await o.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(o.getByTestId('ai-refused')).toBeVisible({ timeout: 30_000 });
  await say(o, 'وما خارج العقار يعتذر عنه بأدب: المساعد محصور في عملك', 3600);
  await finish('assistant', ctx, o);
  await owner.ctx.close();
});

test('video: inspections', async ({ browser }) => {
  test.setTimeout(600_000);
  await warm(browser);
  const owner = await ownerWithLease(browser, 'vi', `vi-tenant-${Date.now()}@rasikh.test`);
  const { ctx, page: o } = await recordFrom(browser, owner.ctx, 'inspections');
  await o.goto('/ar/workspace');
  await o.getByRole('tab', { name: 'الفحوصات' }).click();
  await say(o, 'الفحص عند الاستلام والتسليم: يوثّق حالة الوحدة قبل أي خلاف', 3400);
  await o.getByLabel('العقد', { exact: true }).selectOption({ index: 1 });
  await o.getByLabel('عدد غرف النوم').fill('1');
  await say(o, 'اختر العقد وعدد الغرف ثم ابدأ الفحص', 2600);
  await o.getByRole('button', { name: 'ابدأ فحصاً' }).click();
  await expect(o.getByTestId('inspection-editor')).toBeVisible({ timeout: 30_000 });
  await say(o, 'قائمة فحص غرفة غرفة، وعدّاد التقدم يبيّن ما بقي', 3600);
  await o.getByTestId('progress').scrollIntoViewIfNeeded();
  await say(o, 'لا يمكن التوقيع قبل الإجابة عن كل بند', 3200);
  await expect(o.getByTestId('sign-owner')).toBeDisabled();
  await say(o, 'الصور تُلتقط من داخل التطبيق فقط، بوقتها وموقعها وبصمة SHA-256', 4200);
  await say(o, 'ثم يوقّع الطرفان فيُقفل الفحص ولا يُعدَّل، ويُنتج ملف مقارنة يُرفق في إيجار', 4400);
  await finish('inspections', ctx, o);
  await owner.ctx.close();
});

test('video: the Kingdom map', async ({ browser }) => {
  test.setTimeout(420_000);
  await warm(browser);
  const { ctx, page } = await recordPublic(browser, 'map');
  // the real Mapbox map (needs the network and the token), not the flat fallback used by automated tests
  await page.addInitScript(() => {
    (window as unknown as { __RK_FORCE_MAP: boolean }).__RK_FORCE_MAP = true;
  });
  await page.goto('/ar/map');
  await expect(page.locator('[data-city="riyadh"]')).toBeVisible({ timeout: 120_000 });
  await say(page, 'خريطة المملكة ثلاثية الأبعاد: تصل من الفضاء إلى المملكة', 5200);
  await say(page, 'دبوس لكل مدينة، وعقاراتك عليها', 3000);
  await page.locator('[data-city="abha"]').click();
  await say(page, 'اختر مدينة فتطير الكاميرا إليها', 5200);
  await page.getByTestId('row-p9').click();
  await expect(page.getByTestId('peek-card')).toBeVisible();
  await say(page, 'اختر عقاراً فتقترب منه الكاميرا ويظهر البيت نفسه على أرضه', 6500);
  await say(page, 'البيت هو التصميم المعتمد للعقار: جدرانه وسقفه ونوافذه وسوره وأشجاره', 5200);
  await page.getByRole('button', { name: 'إغلاق البطاقة' }).click();
  await page.getByRole('button', { name: 'المملكة كاملة' }).first().click();
  await page.waitForTimeout(3500);
  await page.locator('[data-city="jeddah"]').click();
  await page.waitForTimeout(3000);
  await page.getByTestId('row-p5').click();
  await say(page, 'وفي العمائر: مبنى بعدد الأدوار والوحدات كما في سجلاتك', 6500);
  await say(page, 'مالك العقار يضع الدبوس على موقعه الدقيق من الجوال وهو في العقار', 4200);
  await finish('map', ctx, page);
});

test('video: the four design styles in 3D', async ({ browser }) => {
  test.setTimeout(300_000);
  await warm(browser);
  const { ctx, page } = await recordPublic(browser, 'styles');
  await page.goto('/ar/design-lab/styles');
  await expect(page.getByTestId('style-gallery').locator('section')).toHaveCount(4, {
    timeout: 60_000,
  });
  await say(page, 'أربعة طُرز لنفس الطلب على نفس الأرض: نجدي وحديث وسويسري وفخم', 4000);
  const moves: Array<[string, string]> = [
    ['modern_najdi', 'النجدي: فناء وشرفات مثلثة وفتحات صغيرة'],
    ['contemporary', 'الحديث: كسوة داكنة وزجاج واسع وسقف رفيع'],
    ['swiss', 'السويسري: سقف مائل وخشب ومصاريع'],
    ['palace', 'الفخم: تناظر ورواق أعمدة وقبة'],
  ];
  for (const [style, text] of moves) {
    const card = page.locator(`[data-style="${style}"] [data-3d]`);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await say(page, `${text}. مرّر المؤشر ليظهر مجسماً`, 1800);
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 12 });
    await page.waitForTimeout(1200);
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.4, { steps: 24 });
    await page.waitForTimeout(1800);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
  }
  await say(page, 'كل تصميم يطابق مساحة الأرض وأضلاعها واشتراطاتها قبل أن يُعرض', 4000);
  await finish('styles', ctx, page);
});
