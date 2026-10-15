import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { grantPlatformAdmin, signUpEmail, verifyEmail } from './helpers';

const SHOTS = '../../docs/screenshots/engineering';
const shot = (p: Page, name: string) =>
  p.screenshot({ path: `${SHOTS}/desktop-${name}.png`, fullPage: true });

async function person(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('dialog', (d) => void d.accept()); // the approval confirmation
  await signUpEmail(page, email);
  await expect(page).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  return { ctx, page };
}

async function myEngineerProfile(p: Page, name: string, sce: string, discipline: string) {
  await p.getByRole('tab', { name: 'الفريق' }).click();
  const box = p.getByTestId('my-engineer-profile');
  await box.getByLabel('الاسم').fill(name);
  await box.getByLabel('رقم العضوية').fill(sce);
  await box.getByLabel('التخصص').selectOption(discipline);
  await box.getByLabel('تاريخ انتهاء العضوية').fill('2028-12-31');
  await box.getByRole('button', { name: 'احفظ' }).click();
  await expect(box).toContainText('بانتظار التحقق', { timeout: 20_000 });
}

test('engineering office: brief → options → client picks → development → discipline approvals → release', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(420_000);
  const stamp = Date.now();
  const officeName = `مكتب الأفق الهندسي ${stamp}`;

  // 1) the office lead registers an engineering office (unverified, not taking briefs yet)
  const leadEmail = `lead-${stamp}@rasikh.test`;
  const lead = await person(browser, leadEmail);
  await verifyEmail(request, leadEmail);
  await lead.page.getByText('مكتب هندسي', { exact: true }).click();
  await lead.page.locator('#displayName').fill('م. فيصل');
  await lead.page.locator('#orgName').fill(officeName);
  await lead.page.locator('input[type=checkbox]').last().check();
  await lead.page.locator('main button').last().click();
  await expect(lead.page.getByTestId('office-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(lead.page.getByTestId('office-pending')).toBeVisible();

  await lead.page.getByRole('tab', { name: 'ملف المكتب' }).click();
  const profile = lead.page.getByTestId('office-profile');
  await profile.getByLabel('رقم السجل التجاري').fill('1010123456');
  await profile.getByLabel('تصنيف هيئة المهندسين').fill('مكتب استشاري — فئة أ');
  await profile.getByLabel('المكتب مفعّل في بلدي').check();
  await profile.getByLabel('معماري').check();
  await profile.getByLabel('إنشائي').check();
  await profile.getByLabel('المدن التي يخدمها (افصل بفاصلة)').fill('الرياض، الخرج');
  await profile.getByLabel('يستقبل طلبات العملاء').check();
  await profile.getByRole('button', { name: 'احفظ' }).click();
  await expect(profile).toContainText('حُفظ');
  await myEngineerProfile(lead.page, 'م. فيصل', '445566', 'architectural');

  // 2) a structural engineer joins the office
  const strEmail = `str-${stamp}@rasikh.test`;
  const str = await person(browser, strEmail);
  await verifyEmail(request, strEmail);
  await lead.page.getByLabel('بريد المهندس').fill(strEmail);
  await lead.page.getByRole('button', { name: 'أضف', exact: true }).click();
  await expect(lead.page.getByText('أُضيف المهندس.')).toBeVisible({ timeout: 20_000 });
  await str.page.goto('/ar/workspace');
  await expect(str.page.getByTestId('office-workspace')).toBeVisible({ timeout: 45_000 });
  await myEngineerProfile(str.page, 'م. سارة', '778899', 'structural');

  // 3) the Rasikh team verifies the office and both engineers
  const teamEmail = `team-eng-${stamp}@rasikh.test`;
  const team = await person(browser, teamEmail);
  await grantPlatformAdmin(request, teamEmail);
  await team.page.goto('/ar/admin');
  await team.page.getByRole('tab', { name: 'التحقق من المكاتب' }).click();
  const row = team.page.getByTestId('verify-office').filter({ hasText: officeName });
  await expect(row.getByText('م. سارة')).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: 'وثّق' }).first().click(); // the office
  await expect(row.getByRole('button', { name: 'ألغِ التوثيق' })).toHaveCount(1);
  while ((await row.getByRole('button', { name: 'وثّق' }).count()) > 0) {
    await row.getByRole('button', { name: 'وثّق' }).first().click();
    await team.page.waitForTimeout(400);
  }
  await expect(row.getByRole('button', { name: 'ألغِ التوثيق' })).toHaveCount(3);

  // 4) a client sends a brief in their own words; the programme is read back for confirmation
  const client = await person(browser, `client-${stamp}@rasikh.test`);
  await client.page.goto('/ar/design');
  const form = client.page.getByTestId('brief-form');
  await form.getByLabel(new RegExp(officeName)).check();
  await form.getByLabel('اسم المشروع').fill('فيلا النرجس');
  await form
    .getByLabel('صف ما تريد')
    .fill(
      'فيلا دورين على أرض ٢٢×٣٢، ٤ غرف نوم و٤ دورات مياه، مجلس رجال ومجلس نساء، غرفة خادمة، مصلى، طراز نجدي، الميزانية ١٫٥ مليون',
    );
  await form.getByRole('button', { name: 'اقرأ الوصف' }).click();
  await expect(form.getByTestId('program')).toBeVisible();
  await expect(form.getByTestId('missing')).toHaveCount(0);
  // the brief reader filled the plot, the bathrooms, the extra rooms and the budget
  await expect(form.getByLabel('عرض الواجهة (م)')).toHaveValue('22');
  await expect(form.getByLabel('دورات المياه (مع دورة مياه الضيوف)')).toHaveValue('4');
  await expect(form.getByLabel('مصلى')).toBeChecked();
  await expect(form.getByLabel('إلى (ر.س)')).toHaveValue('1500000');
  await shot(client.page, 'client-brief');
  await form.getByRole('button', { name: 'أكّد البرنامج وأرسل للمكتب' }).click();
  await expect(form.getByText('أُرسل طلبك إلى المكتب.')).toBeVisible({ timeout: 20_000 });
  await form.getByRole('link', { name: 'افتح المشروع' }).click();
  await expect(client.page.getByTestId('project-status')).toHaveText('طلب جديد', {
    timeout: 45_000,
  });
  const projectUrl = client.page.url();

  // 5) the office enters the municipal zoning, accepts, generates and shares options
  await lead.page.getByRole('tab', { name: 'المشاريع' }).click();
  await lead.page.getByTestId('office-project').filter({ hasText: 'فيلا النرجس' }).click();
  await expect(lead.page.getByTestId('project-view')).toBeVisible({ timeout: 45_000 });
  const z = lead.page.getByTestId('zoning-form');
  await z.getByLabel('الارتداد الأمام (م)').fill('4');
  for (const s of ['الخلف', 'اليسار', 'اليمين']) await z.getByLabel(`الارتداد ${s} (م)`).fill('2');
  await z.getByLabel('معامل البناء الأقصى').fill('1.8');
  await z.getByLabel('أقصى عدد أدوار').fill('3');
  await z.getByLabel('أقصى ارتفاع (م)').fill('12');
  await z.getByLabel('ميكانيكي').uncheck();
  await z.getByLabel('كهربائي').uncheck();
  await z.getByRole('button', { name: 'اقبل الطلب' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('مقبول', { timeout: 20_000 });
  await lead.page.getByRole('tab', { name: 'الخيارات' }).click();
  // the assistant designs 8 different options, each holding the whole brief and passing every automatic check
  await lead.page.getByRole('button', { name: 'صمّم 8 خيارات' }).click();
  await expect(lead.page.locator('[data-testid^="concept-"]')).toHaveCount(8, { timeout: 30_000 });
  await expect(lead.page.getByTestId('search-summary')).toContainText('اختير منها 8 تصاميم مختلفة');
  await expect(lead.page.getByTestId('draft-watermark').first()).toBeVisible();
  await expect(lead.page.getByTestId('compare').locator('tbody tr')).toHaveCount(8);
  const optionA = lead.page.getByTestId('concept-A');
  await expect(optionA.getByTestId('fit-notes')).toContainText('يحتوي كل ما في الوصف');
  await expect(optionA.getByTestId('fit-notes')).toContainText('مصلى');
  await expect(optionA.getByTestId('option-checks')).toContainText(
    'الاشتراطات البلدية: 6 من 6 مطابقة',
  );
  await expect(optionA.getByTestId('option-checks')).toContainText(
    'فحوص الكود الآلية: 9 من 9 تجتاز',
  );
  await shot(lead.page, 'concepts');
  await optionA.locator('summary').click();
  await expect(optionA.getByTestId('boq-table')).toContainText('حديد التسليح');
  await expect(optionA.getByTestId('boq-table')).toContainText('العزل الحراري');
  await optionA.scrollIntoViewIfNeeded();
  await shot(lead.page, 'concept-boq');
  await lead.page.getByRole('button', { name: 'شارك الخيارات مع العميل' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('خيارات مع العميل', {
    timeout: 20_000,
  });

  // 6) the client picks an option (they never see internal drafts)
  await client.page.goto(projectUrl);
  await client.page.getByRole('tab', { name: 'الخيارات' }).click();
  await expect(client.page.locator('[data-testid^="concept-"]')).toHaveCount(8, {
    timeout: 30_000,
  });
  // the client compares the options, with the same checks and costs the office saw
  await expect(client.page.getByTestId('compare')).toContainText('الميزانية');
  await expect(client.page.getByTestId('concept-A').getByTestId('option-checks')).toContainText(
    'الاشتراطات البلدية: 6 من 6 مطابقة',
  );
  await expect(client.page.getByTestId('concept-A').getByTestId('option-cost')).toContainText(
    'ليست عرض سعر',
  );
  await shot(client.page, 'client-options');
  // the options page is accessible, and at phone width nothing scrolls sideways
  await client.page.getByTestId('concept-A').locator('summary').click();
  const optionsAxe = await new AxeBuilder({ page: client.page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    optionsAxe.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    ),
    'client options',
  ).toEqual([]);
  await client.page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => client.page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await client.page.screenshot({ path: `${SHOTS}/mobile-client-options.png`, fullPage: true });
  await client.page.setViewportSize({ width: 1280, height: 720 });
  await client.page.getByRole('button', { name: 'اختر هذا الخيار' }).first().click();
  await expect(client.page.getByTestId('project-status')).toHaveText('اختار العميل', {
    timeout: 20_000,
  });

  // 7) the office develops it: edit a room, the checks re-run, then send it for review
  await lead.page.getByRole('button', { name: 'ابدأ التطوير على الخيار المختار' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('قيد التطوير', {
    timeout: 20_000,
  });
  await lead.page.getByRole('tab', { name: 'المخطط والفحص' }).click();
  const editor = lead.page.getByTestId('plan-editor');
  await expect(editor.getByTestId('checks-report')).toBeVisible();
  await expect(editor.getByTestId('rule-Z-SETBACK')).toHaveAttribute('data-status', 'passed');
  await expect(editor.getByTestId('rule-C-ROOM-AREA')).toHaveAttribute(
    'data-status',
    'not_checked',
  );
  await editor.getByLabel('اختر غرفة من المخطط لتعديلها.').selectOption({ index: 2 });
  await editor.getByLabel('العرض (م)').fill('5');
  await editor.getByRole('button', { name: 'طبّق' }).click();
  await shot(lead.page, 'plan-editor');
  await editor.getByRole('button', { name: 'أرسل للمراجعة' }).click();
  await expect(lead.page.getByTestId('project-status')).toHaveText('قيد المراجعة', {
    timeout: 20_000,
  });

  // the other disciplines' numbers and the drawing set are there for the review
  await lead.page.getByRole('tab', { name: 'التخصصات' }).click();
  await expect(lead.page.getByTestId('cost-range')).toContainText('ليست عرض سعر');
  await shot(lead.page, 'disciplines');
  await lead.page.getByRole('tab', { name: 'النموذج ثلاثي الأبعاد' }).click();
  await lead.page.getByRole('button', { name: 'مؤثث' }).click();
  await lead.page.waitForTimeout(2500);
  await shot(lead.page, 'model-3d');
  await lead.page.getByRole('tab', { name: 'الرسومات والتصدير' }).click();
  await expect(lead.page.getByTestId('sheet-elevations')).toBeVisible();
  await shot(lead.page, 'drawings');
  const dxf = lead.page.waitForEvent('download');
  await lead.page.getByRole('button', { name: 'نزّل DXF' }).click();
  expect((await dxf).suggestedFilename()).toMatch(/\.dxf$/);

  // 8) each discipline's engineer approves the same fingerprint; then the lead releases
  await lead.page.getByRole('tab', { name: 'الاعتماد والإصدار' }).click();
  await expect(lead.page.getByRole('button', { name: 'أصدر المجموعة النهائية' })).toBeDisabled();
  await lead.page.getByRole('button', { name: 'اعتمد تخصص معماري' }).click();
  await expect(lead.page.getByTestId('approval-architectural')).toContainText('اعتمده م. فيصل', {
    timeout: 20_000,
  });
  await expect(lead.page.getByRole('button', { name: 'اعتمد تخصص إنشائي' })).toHaveCount(0); // not the lead's discipline

  await str.page.goto(projectUrl);
  await str.page.getByRole('tab', { name: 'الاعتماد والإصدار' }).click();
  await str.page.getByRole('button', { name: 'اعتمد تخصص إنشائي' }).click();
  await expect(str.page.getByTestId('approval-structural')).toContainText('اعتمده م. سارة', {
    timeout: 20_000,
  });
  await expect(str.page.getByRole('button', { name: 'أصدر المجموعة النهائية' })).toHaveCount(0); // only the lead releases

  await lead.page.getByRole('button', { name: 'أصدر المجموعة النهائية' }).click();
  await expect(lead.page.getByTestId('released')).toBeVisible({ timeout: 20_000 });
  await expect(lead.page.getByTestId('project-status')).toHaveText('صدرت المجموعة');

  // 9) the client now sees the released set with its approval record (no draft watermark)
  await client.page.goto(projectUrl);
  await client.page.getByRole('tab', { name: 'الرسومات والتصدير' }).click();
  await expect(client.page.getByTestId('sheet-plan-0')).toBeVisible({ timeout: 30_000 });
  await expect(client.page.getByTestId('draft-watermark')).toHaveCount(0);
  await expect(client.page.getByTestId('sheet-plan-0')).toContainText('م. سارة');
  await shot(client.page, 'client-released');

  // accessibility of the office and client screens
  const axe = async (p: Page) =>
    (
      await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(await axe(client.page), 'client project').toEqual([]);
  await lead.page.getByRole('tab', { name: 'المخطط والفحص' }).click();
  expect(await axe(lead.page), 'office plan editor').toEqual([]);
  await client.page.goto('/ar/design');
  await expect(client.page.getByTestId('my-project')).toHaveCount(1, { timeout: 30_000 });
  expect(await axe(client.page), 'client design page').toEqual([]);
  await lead.page.goto('/ar/workspace');
  await expect(lead.page.getByTestId('office-workspace')).toBeVisible({ timeout: 30_000 });
  expect(await axe(lead.page), 'office workspace').toEqual([]);

  for (const x of [lead, str, team, client]) await x.ctx.close();
});
