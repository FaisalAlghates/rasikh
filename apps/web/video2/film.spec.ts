import { expect, test, type APIRequestContext, type Browser } from '@playwright/test';
import {
  PASSWORD,
  addPropertyUnitLease,
  onboardOwner,
  signUpEmail,
  tenantJoins,
  verifyEmail,
} from '../e2e/helpers';
import { openTrack, type Form, type Track } from './track';

const stamp = Date.now();
const mail = (who: string, form: Form) => `${who}-${form}-${stamp}@rasikh.test`;
const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const STORAGE = 'http://127.0.0.1:9199';
const BUCKET = 'demo-rasikh.appspot.com';
const FORMS: Form[] = ['desktop', 'mobile'];

type Run = (t: Track, form: Form, browser: Browser, request: APIRequestContext) => Promise<void>;

/** Runs the same steps twice: once on a desktop browser, once on a phone-sized one. */
function scene(name: string, run: Run, geo = false, minutes = 8) {
  test(`film ${name}`, async ({ browser, request }) => {
    test.setTimeout(minutes * 60_000);
    for (const form of FORMS) {
      const t = await openTrack(browser, name, form, geo);
      await run(t, form, browser, request);
      await t.finish();
    }
  });
}

test.describe.configure({ mode: 'serial' });

// ----------------------------------------------------------------------------- the landing page and the map
scene('01-landing', async (t) => {
  const p = t.page;
  await p.goto('/ar');
  await t.step('واجهة عربية أولاً، بهوية «نجد الغروب»', 3200);
  await t.step('نتعرّف على المنصة', 400);
  await t.scroll(620, 1300);
  await t.scroll(620, 1300);
  await t.step('أدوار المنصة: مالك، مستأجر، مدير عمارة، ووسيط', 400);
  await t.scroll(620, 1400);
  await t.scroll(620, 1400);
  await t.scroll(620, 1400);
  await t.step('سجل العقار: كل حدث موثّق في خط زمني واحد', 400);
  await t.scroll(700, 1600);
  await t.scroll(700, 1600);
});

// ----------------------------------------------------------------------------- the site shell (DGA Platforms Code)
scene('01b-site', async (t, form) => {
  const p = t.page;
  await p.goto('/ar/about');
  await t.step('كل الصفحات مترابطة: رأس وتذييل موحّدان ومسار تصفح في كل صفحة', 2600);
  if (form === 'mobile') {
    await p.getByRole('button', { name: 'افتح القائمة' }).click();
    await t.beat(1800);
    await p.getByRole('dialog').getByRole('link', { name: 'مركز المساعدة', exact: true }).click();
  } else {
    await p
      .getByRole('navigation', { name: 'التنقل الرئيسي' })
      .getByRole('link', { name: 'مركز المساعدة' })
      .click();
  }
  await expect(p).toHaveURL(/\/ar\/help/, { timeout: 45_000 });
  await t.step('مركز المساعدة: ابحث في الأسئلة وتظهر الإجابة فوراً', 600);
  await p.getByLabel('ابحث في الأسئلة').pressSequentially('تصويت', { delay: 90 });
  await t.beat(2600);
  await t.step('بحث في كل الموقع مع اقتراحات أثناء الكتابة', 300);
  await p.getByRole('button', { name: 'افتح البحث' }).click();
  await p.getByRole('combobox', { name: 'البحث' }).pressSequentially('الخصوصية', { delay: 90 });
  await t.beat(2600);
  await p.keyboard.press('Escape');
  await t.step('أدوات إمكانية الوصول: تكبير الخط وتباين أعلى، مطابقة لكود المنصات', 300);
  const tools = p.getByRole('group', { name: 'أدوات إمكانية الوصول' });
  await tools.scrollIntoViewIfNeeded();
  await t.beat(900);
  await tools.getByRole('button', { name: 'تكبير الخط' }).click();
  await t.beat(1400);
  await tools.getByRole('button', { name: 'تباين أعلى' }).click();
  await t.beat(2200);
  await tools.getByRole('button', { name: 'تباين أعلى' }).click();
  await tools.getByRole('button', { name: 'حجم الخط الافتراضي' }).click();
  await t.beat(800);
});

// ----------------------------------------------------------------------------- the Kingdom map
scene('01c-map', async (t) => {
  const p = t.page;
  await p.goto('/ar/map');
  await t.step(
    'خريطة المملكة ثلاثية الأبعاد: من الكرة الأرضية إلى مناطق المملكة الثلاث عشرة',
    9000,
  );
  await t.step('اختر مدينة فتطير إليها: مبانٍ ثلاثية الأبعاد ومؤشرات الأحياء', 300);
  await p.getByTestId('city-jeddah').click();
  await t.beat(5200);
  await t.step('كل عقار بحالته: مدفوع، قريب الاستحقاق، متأخر', 300);
  await p.getByTestId('row-p5').click();
  await t.beat(4600);
  await p.getByTestId('city-riyadh').click();
  await t.beat(5000);
});

// ----------------------------------------------------------------------------- the owner
scene('02-owner', async (t, form) => {
  const p = t.page;
  await p.goto('/ar/auth');
  await t.step('المالك ينشئ حسابه ويختار دوره ويوافق على معالجة بياناته', 300);
  await onboardOwner(p, mail('owner', form));
  await t.step('مساحة العمل: الوحدات والعقود والدفعات والتنبيهات في نظرة واحدة', 3200);
  await t.step('يضيف عقاراً ووحدة، ثم عقد إيجار برقم عقد «إيجار»', 300);
  await addPropertyUnitLease(p, {
    tenantEmail: mail('tenant-demo', form),
    property: 'برج النخيل',
    unit: 'شقة 12',
    ejarNo: '10203040',
  });
  await t.step('يُولَّد جدول الدفعات تلقائياً، مع تذكيرات مجانية وتصدير للتقويم', 2400);
  await t.scroll(520, 2200);
  await t.step('العمارات: مصروف مشترك بإيصال إلزامي، يُقسَّم على الملاك بدقة الهللة', 300);
  await p.getByRole('tab', { name: 'العمارات والجمعيات' }).click();
  await p.getByLabel('اسم العمارة').fill('عمارة الواحة');
  await p.getByRole('button', { name: 'أضف عمارة' }).click();
  await expect(p.getByTestId('building-board')).toBeVisible({ timeout: 20_000 });
  for (const [name, unit, share] of [
    ['سالم', '1', '60'],
    ['نورة', '2', '40'],
  ]) {
    await p.getByLabel('اسم المالك', { exact: true }).first().fill(name!);
    await p.getByLabel('الوحدة', { exact: true }).fill(unit!);
    await p.getByLabel('النصيب من المصاريف (%)').fill(share!);
    await p.getByRole('button', { name: 'أضف مالكاً' }).click();
    await expect(p.locator('#bm-name')).toHaveValue('');
  }
  await p.getByLabel('البيان').fill('صيانة المصعد');
  await p.getByLabel('المبلغ (ر.س)', { exact: true }).first().fill('1000');
  await p.locator('#be-receipt').setInputFiles({
    name: 'receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await p.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(p.getByTestId('bexpense-row')).toHaveCount(1, { timeout: 20_000 });
  await p.getByTestId('bexpense-row').scrollIntoViewIfNeeded();
  await t.beat(2600);
  await t.step('المساعد الذكي يجيب من سجلاتك أنت، وإجاباته موسومة وليست قرارات', 300);
  await p.getByRole('tab', { name: 'المساعد' }).click();
  await p.locator('#ai-q').pressSequentially('كم عقداً عندي وهل في دفعات متأخرة؟', { delay: 35 });
  await p.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(p.getByTestId('ai-answer')).toBeVisible({ timeout: 30_000 });
  await p.getByTestId('ai-answer').scrollIntoViewIfNeeded();
  await t.beat(3400);
  await t.step('عقاراته على خريطة المملكة، ويحدد موقع العقار بدقة بنقرة', 300);
  await p.getByRole('tab', { name: 'العقارات والوحدات' }).click();
  await p
    .getByTestId('property-برج النخيل')
    .getByRole('link', { name: 'اعرضه على الخريطة' })
    .click();
  await expect(p.getByTestId('peek-card')).toContainText('برج النخيل', { timeout: 45_000 });
  await t.beat(4200);
  await p.getByTestId('set-pin').click();
  await t.beat(900);
  // click on open map: below the search bar and above the (now compact) property card
  const canvas = (await p.locator('.mapboxgl-canvas').boundingBox())!;
  const glass = (await p.locator('.glass').boundingBox())!;
  const card = (await p.getByTestId('peek-card').boundingBox())!;
  await p.mouse.click(canvas.x + canvas.width * 0.5, (glass.y + glass.height + card.y) / 2);
  await expect(p.getByTestId('peek-card')).toContainText('حُفظ الموقع الدقيق', { timeout: 20_000 });
  await t.beat(3000);
});

// ----------------------------------------------------------------------------- the tenant
scene('03-tenant', async (t, form, browser, request) => {
  const tenantEmail = mail('tenant', form);
  const bctx = await browser.newContext();
  const o = await bctx.newPage();
  await onboardOwner(o, mail('owner-t', form));
  await addPropertyUnitLease(o, {
    tenantEmail,
    property: 'برج الصيانة',
    unit: 'شقة 7',
    ejarNo: 'MNT-2026-01',
  });

  const p = t.page;
  await p.goto('/ar/auth');
  await t.step('المستأجر يسجّل بالبريد الذي دعاه به المالك، فيرتبط عقده تلقائياً', 300);
  await tenantJoins(p, request, tenantEmail);
  await t.step('يرى عقده وجدول دفعاته وتنبيهاته', 2600);
  await t.scroll(560, 1800);
  await t.step('يرفع بلاغ صيانة بصورة وتصنيف وأولوية', 300);
  await p.getByLabel('عنوان البلاغ').scrollIntoViewIfNeeded();
  await p.getByLabel('عنوان البلاغ').pressSequentially('تسريب تحت المغسلة', { delay: 40 });
  await p.getByLabel('التصنيف').selectOption('plumbing');
  await p.getByLabel('الأولوية').selectOption('urgent');
  await p.locator('#tk-photo').setInputFiles({
    name: 'leak.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([255, 216, 255, 224, 0, 16]),
  });
  await p.getByRole('button', { name: 'أرسل البلاغ' }).click();
  await expect(p.getByTestId('ticket-detail')).toBeVisible({ timeout: 30_000 });
  await t.step('المنصة تقترح المسؤولية ومهلة الإنجاز، والقرار للطرفين', 3600);

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

  await t.step('المالك أسند الطلب وأنجزه، والمستأجر يرى الحالة لحظياً ثم يغلق ويقيّم', 300);
  await expect(p.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 30_000 });
  await p.getByLabel('التقييم (من 5)').selectOption('4');
  await p.getByRole('button', { name: 'أغلق وقيّم' }).click();
  await expect(p.getByTestId('status')).toContainText('مغلق', { timeout: 20_000 });
  await t.beat(2600);
  await bctx.close();
});

// ----------------------------------------------------------------------------- the inspection
scene(
  '04-inspection',
  async (t, form, browser, request) => {
    const tenantEmail = mail('tenant-i', form);
    const p = t.page;
    await p.goto('/ar/auth');
    await onboardOwner(p, mail('owner-i', form));
    await addPropertyUnitLease(p, {
      tenantEmail,
      property: 'برج الفحص',
      unit: 'شقة 5',
      ejarNo: 'INSP-2026-01',
    });
    await t.step('فحص الاستلام: غرفة بغرفة، ولا توقيع قبل الإجابة عن كل بند', 300);
    await p.getByRole('tab', { name: 'الفحوصات' }).click();
    await p.getByLabel('العقد', { exact: true }).selectOption({ index: 1 });
    await p.getByLabel('عدد غرف النوم').fill('1');
    await p.getByRole('button', { name: 'ابدأ فحصاً' }).click();
    await expect(p.getByTestId('inspection-editor')).toBeVisible();
    for (const key of [
      'entrance',
      'living',
      'bedroom_1',
      'kitchen',
      'bathroom_1',
      'balcony',
      'meters',
    ]) {
      const d = p.getByTestId(`room-${key}`);
      if (!(await d.evaluate((el) => (el as HTMLDetailsElement).open)))
        await d.locator('summary').click();
      await d.getByRole('button', { name: 'كل بنود الغرفة سليمة' }).click();
      await t.beat(350);
    }
    await expect(p.getByTestId('progress')).toContainText('48 من 48');
    await t.step('عيب في الجدار: صورة بكاميرا التطبيق فقط، لا من المعرض', 300);
    await p.getByTestId('room-living').getByLabel('الحالة').first().selectOption('damaged');
    const item = p.getByTestId('item-living__walls');
    await item.getByTestId('camera-open').click();
    const shutter = p.getByTestId('camera-shutter');
    await expect(shutter).toBeEnabled({ timeout: 15_000 });
    await t.beat(900);
    await shutter.click();
    await expect(item.getByTestId('evidence')).toHaveCount(1, { timeout: 30_000 });
    const evidence = item.getByTestId('evidence');
    await evidence.scrollIntoViewIfNeeded();
    await t.step('لحظة الالتقاط: بصمة SHA-256 ووقت وموقع، والتحقق يثبت المطابقة', 300);
    await evidence.getByTestId('verify-evidence').click();
    await expect(evidence.getByTestId('verify-result')).toContainText('مطابق');
    await t.beat(3000);

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
    await t.step('محاولة تلاعب: بايت واحد تغيّر في الصورة… فيرفض الخادم التوقيع', 300);
    await p.getByTestId('sign-owner').click();
    await p.locator('#sign-password').fill(PASSWORD);
    await p.getByTestId('sign-confirm').click();
    await expect(p.getByRole('alert')).toContainText('تغيّر أحد الملفات', { timeout: 30_000 });
    await t.beat(3400);
    await p.keyboard.press('Escape');
    await put(original);
    await t.step('بالملف الأصلي يمرّ التوقيع، بعد إعادة إدخال كلمة المرور', 300);
    await p.getByTestId('sign-owner').click();
    await p.locator('#sign-password').fill(PASSWORD);
    await p.getByTestId('sign-confirm').click();
    await expect(p.getByTestId('signed-owner')).toContainText('وقّع', { timeout: 30_000 });
    await t.beat(2200);

    const tctx = await browser.newContext();
    const tp = await tctx.newPage();
    await tenantJoins(tp, request, tenantEmail);
    await tp.getByTestId('inspection-move_in').click();
    await tp.getByTestId('sign-tenant').click();
    await tp.locator('#sign-password').fill(PASSWORD);
    await tp.getByTestId('sign-confirm').click();
    await expect(tp.getByTestId('sign-panel')).toContainText('موثّق ومقفل', { timeout: 30_000 });
    await tctx.close();

    await t.step('وقّع المستأجر: سجل مقفل ببصمة واحدة، جاهز للإرفاق في «إيجار»', 300);
    await p.reload();
    await p.getByRole('tab', { name: 'الفحوصات' }).click();
    await p.getByTestId('inspection-move_in').click();
    await expect(p.getByTestId('sealed-note')).toContainText('بصمة المحتوى');
    await p.getByTestId('sealed-note').scrollIntoViewIfNeeded();
    await t.beat(4200);
  },
  true,
  12,
);

// ----------------------------------------------------------------------------- the vendor
scene('05-vendor', async (t, form, browser, request) => {
  const vendorEmail = mail('vendor', form);
  const p = t.page;
  await p.goto('/ar/auth');
  await signUpEmail(p, vendorEmail);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await verifyEmail(request, vendorEmail);

  const octx = await browser.newContext();
  const o = await octx.newPage();
  await onboardOwner(o, mail('owner-v', form));
  await addPropertyUnitLease(o, {
    tenantEmail: mail('nobody', form),
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

  await t.step('الفنّي يرى الأعمال المسندة إليه فقط، ولا يفتح بلاغات جديدة', 300);
  await p.goto('/ar/workspace');
  await expect(p.getByRole('heading', { name: 'البلاغات المسندة إليّ' })).toBeVisible({
    timeout: 30_000,
  });
  await t.beat(2600);
  await p.getByTestId('ticket-row').click();
  await t.step('يبدأ التنفيذ ويسجّل الإصلاح، والإغلاق والتقييم لصاحب الطلب', 300);
  await p.getByRole('button', { name: 'بدأ التنفيذ' }).click();
  await expect(p.getByTestId('status')).toContainText('قيد التنفيذ', { timeout: 20_000 });
  await p
    .getByLabel('ملاحظة الإصلاح')
    .pressSequentially('تم تنظيف الوحدة وتعبئة الغاز', { delay: 30 });
  await p.getByRole('button', { name: 'تم الإصلاح' }).click();
  await expect(p.getByTestId('status')).toContainText('تم الإصلاح', { timeout: 20_000 });
  await t.beat(2600);
  await octx.close();
});

// ----------------------------------------------------------------------------- the owner of a unit in a building
scene('06-unit-owner', async (t, form, browser, request) => {
  const unitEmail = mail('unit', form);
  const p = t.page;
  await p.goto('/ar/auth');
  await signUpEmail(p, unitEmail);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await verifyEmail(request, unitEmail);

  const octx = await browser.newContext();
  const o = await octx.newPage();
  await onboardOwner(o, mail('owner-b', form));
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

  await t.step('مالك الوحدة يرى مصاريف العمارة بإيصالاتها ورصيده المستحق', 300);
  await p.goto('/ar/workspace');
  await expect(p.getByTestId('owner-building')).toBeVisible({ timeout: 30_000 });
  await t.beat(3400);
  await t.step('ويصوّت لوحدته: صوت واحد لكل وحدة، لا يُعدَّل بعد تسجيله', 300);
  await p.getByRole('button', { name: 'موافق', exact: true }).scrollIntoViewIfNeeded();
  await p.getByRole('button', { name: 'موافق', exact: true }).click();
  await expect(p.getByTestId('vote-result')).toContainText('أُقرّ', { timeout: 20_000 });
  await p.getByTestId('vote-result').scrollIntoViewIfNeeded();
  await t.beat(3000);
  await octx.close();
});

// ----------------------------------------------------------------------------- the broker
scene('07-broker', async (t, form) => {
  const p = t.page;
  await p.goto('/ar/auth');
  await t.step('الوسيط يختار دوره ويُنشئ مكتبه', 300);
  await signUpEmail(p, mail('broker', form));
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await p.getByText('وسيط', { exact: true }).click();
  await p.locator('#displayName').fill('سلمان');
  await p.locator('#orgName').fill('مكتب الأفق');
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p.getByTestId('broker-view')).toBeVisible({ timeout: 45_000 });
  await t.step('رخصة «فال» مع تنبيه قبل الانتهاء بـ 60 و30 و7 أيام', 300);
  await p.locator('#bp-name').fill('سلمان');
  await p.locator('#bp-fal').fill('1234567890');
  await p.locator('#bp-exp').fill(iso(20));
  await p.getByRole('button', { name: 'احفظ الملف' }).click();
  await expect(p.getByTestId('fal-state')).toContainText('تنتهي رخصتك خلال', { timeout: 15_000 });
  await p.getByTestId('fal-state').scrollIntoViewIfNeeded();
  await t.beat(2600);
  await t.step('عميل جديد ومعاينة وعقد وساطة، وسجل أنشطة يختمه الخادم ولا يُعدَّل', 300);
  await p.locator('#ld-name').fill('خالد');
  await p.locator('#ld-phone').fill('+966512345678');
  await p.getByRole('button', { name: 'أضف عميلاً' }).click();
  await expect(p.getByTestId('lead-row')).toHaveCount(1, { timeout: 20_000 });
  await p.getByRole('button', { name: 'افتح', exact: true }).click();
  await p.getByRole('button', { name: 'انقله إلى تم التواصل' }).click();
  await expect(p.getByTestId('lead-status')).toContainText('تم التواصل', { timeout: 15_000 });
  await p.locator('#vw-place').fill('فيلا النرجس');
  await p.locator('#vw-when').fill('2026-12-01T15:00');
  await p.getByRole('button', { name: 'حدّد معاينة' }).click();
  await expect(p.getByTestId('viewing-row')).toHaveCount(1, { timeout: 15_000 });
  await p.locator('#bc-no').fill('BR-2026-001');
  await p.locator('#bc-end').fill(iso(365));
  await p.getByRole('button', { name: 'أضف عقد وساطة' }).click();
  await expect(p.getByTestId('contract-row')).toHaveCount(1, { timeout: 15_000 });
  await p.getByTestId('activity-log').scrollIntoViewIfNeeded();
  await t.beat(3200);
  await p.getByRole('button', { name: 'رجوع' }).click();
  await t.step('فاحص الإعلان: يكشف البيانات الإلزامية الناقصة قبل النشر', 300);
  await p.getByTestId('ad-checker').scrollIntoViewIfNeeded();
  await t.beat(2400);
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
  await p.getByTestId('ad-verdict').scrollIntoViewIfNeeded();
  await t.step('اكتملت البيانات. وراسخ لا ينشر الإعلان ولا يعتمده', 3600);
});
