import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { grantPlatformAdmin, signUpEmail, verifyEmail } from '../e2e/helpers';
import { CAPTION_SCRIPT, SIZE, finish, plain, say, warm } from './support';

/**
 * The design, drawings and printing walkthrough. The office, its two engineers, the verification and the client's
 * brief are set up unrecorded; the camera starts when the office begins developing the client's chosen option.
 * It also writes a printable sample of the draft drawing set to docs/samples (made before release: it keeps the
 * draft watermark, so it can never be mistaken for an approved set).
 */
async function engineerProfile(p: Page, name: string, sce: string, discipline: string) {
  await p.getByRole('tab', { name: 'الفريق' }).click();
  const box = p.getByTestId('my-engineer-profile');
  await box.getByLabel('الاسم').fill(name);
  await box.getByLabel('رقم العضوية').fill(sce);
  await box.getByLabel('التخصص').selectOption(discipline);
  await box.getByLabel('تاريخ انتهاء العضوية').fill('2028-12-31');
  await box.getByRole('button', { name: 'احفظ' }).click();
  await expect(box).toContainText('بانتظار التحقق', { timeout: 20_000 });
}

test('video: design, drawings and printing', async ({ browser, request }) => {
  test.setTimeout(1_200_000);
  await warm(browser);
  const stamp = Date.now();
  const officeName = `مكتب الأفق الهندسي ${stamp}`;

  // --- setup, unrecorded ---
  const lead = await plain(browser);
  const leadEmail = `dv-lead-${stamp}@rasikh.test`;
  await signUpEmail(lead.page, leadEmail);
  await expect(lead.page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await verifyEmail(request, leadEmail);
  await lead.page.getByRole('button', { name: /المكتب الهندسي/ }).click();
  await lead.page.locator('#displayName').fill('م. فيصل');
  await lead.page.locator('#orgName').fill(officeName);
  await lead.page.locator('input[type=checkbox]').last().check();
  await lead.page.locator('main button').last().click();
  await expect(lead.page.getByTestId('office-workspace')).toBeVisible({ timeout: 45_000 });
  await lead.page.getByRole('tab', { name: 'ملف المكتب' }).click();
  const profile = lead.page.getByTestId('office-profile');
  await profile.getByLabel('رقم السجل التجاري').fill('1010123456');
  await profile.getByLabel('تصنيف هيئة المهندسين').fill('مكتب استشاري — فئة أ');
  await profile.getByLabel('المكتب مفعّل في بلدي').check();
  await profile.getByLabel('معماري').check();
  await profile.getByLabel('إنشائي').check();
  await profile.getByLabel('ميكانيكي').check();
  await profile.getByLabel('كهربائي').check();
  await profile.getByLabel('المدن التي يخدمها (افصل بفاصلة)').fill('الرياض، الخرج');
  await profile.getByLabel('يستقبل طلبات العملاء').check();
  await profile.getByRole('button', { name: 'احفظ' }).click();
  await expect(profile).toContainText('حُفظ');
  await engineerProfile(lead.page, 'م. فيصل', '445566', 'architectural');

  const engineers = [
    {
      key: 'str',
      name: 'م. سارة',
      sce: '778899',
      discipline: 'structural',
      approve: 'إنشائي',
      id: 'structural',
    },
    {
      key: 'mec',
      name: 'م. خالد',
      sce: '112233',
      discipline: 'mechanical',
      approve: 'ميكانيكي',
      id: 'mechanical',
    },
    {
      key: 'ele',
      name: 'م. ريم',
      sce: '334455',
      discipline: 'electrical',
      approve: 'كهربائي',
      id: 'electrical',
    },
  ] as const;
  const people = [];
  for (const e of engineers) {
    const email = `dv-${e.key}-${stamp}@rasikh.test`;
    const person = await plain(browser);
    await signUpEmail(person.page, email);
    await expect(person.page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
    await verifyEmail(request, email);
    await lead.page.getByLabel('بريد المهندس').fill(email);
    await lead.page.getByRole('button', { name: 'أضف', exact: true }).click();
    await expect(lead.page.getByText('أُضيف المهندس.')).toBeVisible({ timeout: 20_000 });
    await person.page.goto('/ar/workspace');
    await expect(person.page.getByTestId('office-workspace')).toBeVisible({ timeout: 45_000 });
    await engineerProfile(person.page, e.name, e.sce, e.discipline);
    people.push({ ...e, ...person });
  }

  const team = await plain(browser);
  const teamEmail = `dv-team-${stamp}@rasikh.test`;
  await signUpEmail(team.page, teamEmail);
  await expect(team.page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await grantPlatformAdmin(request, teamEmail);
  await team.page.goto('/ar/admin');
  await team.page.getByRole('tab', { name: 'التحقق من المكاتب' }).click();
  const row = team.page.getByTestId('verify-office').filter({ hasText: officeName });
  await expect(row.getByText('م. ريم')).toBeVisible({ timeout: 30_000 });
  while ((await row.getByRole('button', { name: 'وثّق' }).count()) > 0) {
    await row.getByRole('button', { name: 'وثّق' }).first().click();
    await team.page.waitForTimeout(500);
  }

  const client = await plain(browser);
  await signUpEmail(client.page, `dv-client-${stamp}@rasikh.test`);
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
  await form.getByRole('link', { name: 'افتح المشروع' }).click();
  await expect(client.page.getByTestId('project-status')).toHaveText('طلب جديد', {
    timeout: 45_000,
  });
  const projectUrl = client.page.url();

  await lead.page.getByRole('tab', { name: 'المشاريع' }).click();
  await lead.page.getByTestId('office-project').filter({ hasText: 'فيلا النرجس' }).click();
  await expect(lead.page.getByTestId('project-view')).toBeVisible({ timeout: 45_000 });
  const z = lead.page.getByTestId('zoning-form');
  await z.getByTestId('regulations').getByRole('button', { name: 'طبّق على القطعة' }).click();
  await z.getByLabel(/أقصى ارتفاع/).fill('14');
  await z.getByRole('button', { name: 'اقبل الطلب' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('مقبول', { timeout: 20_000 });
  await lead.page.getByRole('tab', { name: 'الخيارات' }).click();
  await lead.page.getByRole('button', { name: 'صمّم 8 خيارات' }).click();
  await expect(lead.page.locator('[data-testid^="concept-"]')).toHaveCount(8, {
    timeout: 60_000,
  });
  await lead.page.getByRole('button', { name: 'شارك الخيارات مع العميل' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('خيارات مع العميل', {
    timeout: 20_000,
  });
  await client.page.goto(projectUrl);
  await client.page.getByRole('tab', { name: 'الخيارات' }).click();
  await expect(client.page.locator('[data-testid^="concept-"]')).toHaveCount(8, {
    timeout: 30_000,
  });
  await client.page.getByRole('button', { name: 'اختر هذا الخيار' }).first().click();
  await expect(client.page.getByTestId('project-status')).toHaveText('اختار العميل', {
    timeout: 20_000,
  });
  await lead.page.getByRole('button', { name: 'ابدأ التطوير على الخيار المختار' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('قيد التطوير', {
    timeout: 20_000,
  });

  // --- recording starts here, signed in as the lead (the saved browser state carries the session) ---
  const state = await lead.ctx.storageState({ indexedDB: true });
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: 'test-results/videos/drawings', size: SIZE },
    storageState: state,
  });
  await ctx.addInitScript(CAPTION_SCRIPT);
  const p = await ctx.newPage();
  p.on('dialog', (d) => void d.accept());
  await p.goto(projectUrl);
  await expect(p.getByTestId('project-view')).toBeVisible({ timeout: 60_000 });

  await say(p, 'بعد أن يختار العميل خياره يبدأ التطوير: تعديل المخطط والتحقق منه', 3400);
  await p.getByRole('tab', { name: 'المخطط والفحص' }).click();
  const editor = p.getByTestId('plan-editor');
  await expect(editor.getByTestId('checks-report')).toBeVisible();
  await say(p, 'تقرير الفحص يبيّن كل قاعدة: مطابقة أو غير مفحوصة بانتظار مهندس', 3600);
  await editor.getByLabel('اختر غرفة من المخطط لتعديلها.').selectOption({ index: 2 });
  await say(p, 'عدّل أي غرفة، فتُعاد الفحوص فوراً', 2600);
  await editor.getByLabel('العرض (م)').fill('5');
  await editor.getByRole('button', { name: 'طبّق' }).click();
  await p.waitForTimeout(1500);
  await editor.getByRole('button', { name: 'أرسل للمراجعة' }).click();
  await expect(p.getByTestId('project-status')).toHaveText('قيد المراجعة', { timeout: 20_000 });

  await p.getByRole('tab', { name: 'التخصصات' }).click();
  await say(p, 'تخصصات المشروع: التكلفة والجدول والمخطط الإنشائي المبدئي', 3600);
  await p.getByRole('tab', { name: 'النموذج ثلاثي الأبعاد' }).click();
  await say(p, 'النموذج ثلاثي الأبعاد للمبنى', 2400);
  await p.getByRole('button', { name: 'مؤثث' }).click();
  await say(p, 'وبالأثاث والموقع العام، ويمكنك تدويره', 4200);

  await p.getByRole('tab', { name: 'الرسومات والتصدير' }).click();
  await expect(p.getByTestId('sheet-elevations')).toBeVisible();
  await say(p, 'مجموعة الرسومات: كل لوحة بجدول بيانات فيه المكتب والمشروع والتاريخ', 3600);
  for (const [id, text] of [
    ['site', 'مخطط الموقع: المبنى والارتدادات والمواقف والمسبح'],
    ['plan-0', 'المساقط الأفقية لكل دور بأسماء الغرف وأبعادها'],
    ['elevations', 'الواجهات'],
    ['sections', 'القطاعات'],
    ['schedules', 'جداول الأبواب والنوافذ'],
    ['areas', 'وجدول المساحات'],
    ['thermal', 'لوحة العزل الحراري: طبقات الجدار والسطح وقيمة U لكل منها'],
    ['st-grid', 'المخططات الإنشائية: المحاور والأعمدة عند الأساسات'],
    ['st-slab', 'ومخطط البلاطات والجسور'],
    ['st-calc', 'وملخص الحسابات الإنشائية المبدئية'],
    ['el-0', 'مخططات الكهرباء: نقاط الإنارة والمآخذ ولوحات التوزيع'],
    ['me-0', 'مخططات الميكانيك: وحدات التكييف بالطن وأعمدة الصرف'],
    ['fs-0', 'مخططات السلامة: كواشف الدخان والإنذار والطفايات ولوحات المخارج'],
  ] as const) {
    await p.getByTestId(`sheet-${id}`).scrollIntoViewIfNeeded();
    await say(p, text, 2800);
  }
  await p.getByTestId('draft-watermark').first().scrollIntoViewIfNeeded();
  await say(p, 'العلامة المائية «مسودة» تبقى على كل لوحة حتى يعتمد المهندسون المجموعة', 3600);

  await p.getByRole('button', { name: 'اطبع أو احفظ PDF' }).scrollIntoViewIfNeeded();
  await say(p, 'للطباعة: زر «اطبع أو احفظ PDF» يفتح نافذة الطباعة في متصفحك', 3200);
  await p.emulateMedia({ media: 'print' });
  await p.evaluate(() => window.scrollTo(0, 0));
  await say(p, 'هكذا تظهر الأوراق عند الطباعة: لوحات فقط بقياس A3 أفقي، بدون واجهة الموقع', 4200);
  await p.evaluate(() => window.scrollBy(0, 900));
  await say(p, 'اختر «حفظ بصيغة PDF» لملف، أو اختر الطابعة لطباعتها على الورق', 3600);
  await p.emulateMedia({ media: 'screen' });
  await p.getByRole('button', { name: 'نزّل DXF' }).scrollIntoViewIfNeeded();
  await say(p, 'ولبرامج الرسم يوجد DXF، ولبرامج النمذجة BIM يوجد IFC', 3600);
  const dxf = p.waitForEvent('download');
  await p.getByRole('button', { name: 'نزّل DXF' }).click();
  expect((await dxf).suggestedFilename()).toMatch(/\.dxf$/);
  await say(p, 'تنزل الملفات مباشرة إلى جهازك', 2400);

  // a printable sample of the draft set, for the docs
  const sample = await ctx.newPage();
  await sample.goto(projectUrl);
  await sample.getByRole('tab', { name: 'الرسومات والتصدير' }).click();
  await expect(sample.getByTestId('sheet-elevations')).toBeVisible({ timeout: 30_000 });
  await sample.waitForTimeout(1500);
  mkdirSync('../../docs/samples', { recursive: true });
  await sample.pdf({
    path: '../../docs/samples/drawing-set-draft-sample.pdf',
    preferCSSPageSize: true,
    printBackground: true,
  });
  await sample.close();

  await p.getByRole('tab', { name: 'الاعتماد والإصدار' }).click();
  await say(p, 'الاعتماد: كل مهندس يعتمد تخصصه على نفس بصمة المخطط', 3400);
  await p.getByRole('button', { name: 'اعتمد تخصص معماري' }).click();
  await expect(p.getByTestId('approval-architectural')).toContainText('اعتمده م. فيصل', {
    timeout: 20_000,
  });
  for (const e of people) {
    await e.page.goto(projectUrl);
    await e.page.getByRole('tab', { name: 'الاعتماد والإصدار' }).click();
    await e.page.getByRole('button', { name: `اعتمد تخصص ${e.approve}` }).click();
    await expect(e.page.getByTestId(`approval-${e.id}`)).toContainText(`اعتمده ${e.name}`, {
      timeout: 20_000,
    });
  }
  await say(
    p,
    'ثم يعتمد مهندسو الإنشاء والميكانيك والكهرباء تخصصاتهم، ولا يصدر المكتب قبل اكتمال الاعتماد',
    3000,
  );
  await p.getByRole('button', { name: 'أصدر المجموعة النهائية' }).click();
  await expect(p.getByTestId('released')).toBeVisible({ timeout: 20_000 });
  await say(p, 'صدرت المجموعة: تزول العلامة المائية ويظهر سجل الاعتماد على اللوحات', 3600);
  await p.getByRole('tab', { name: 'الرسومات والتصدير' }).click();
  await expect(p.getByTestId('draft-watermark')).toHaveCount(0);
  await p.getByTestId('sheet-plan-0').scrollIntoViewIfNeeded();
  await say(p, 'وهذه النسخة هي التي تُطبع وتُسلَّم، وتنتقل إلى سجل العقار', 3600);

  await finish('drawings', ctx, p);
  await Promise.all([
    lead.ctx.close(),
    ...people.map((e) => e.ctx.close()),
    team.ctx.close(),
    client.ctx.close(),
  ]);
});
