import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { PASSWORD, addPropertyUnitLease, onboardOwner, tenantJoins } from './helpers';

const STORAGE = 'http://127.0.0.1:9199';
const BUCKET = 'demo-rasikh.appspot.com';

const ROOMS = ['entrance', 'living', 'bedroom_1', 'kitchen', 'bathroom_1', 'balcony', 'meters'];

/** Opens a room (rooms start collapsed except the first). */
async function room(page: Page, key: string): Promise<Locator> {
  const d = page.getByTestId(`room-${key}`);
  if (!(await d.evaluate((el) => (el as HTMLDetailsElement).open)))
    await d.locator('summary').click();
  return d;
}

async function allGood(page: Page) {
  for (const key of ROOMS) {
    const d = await room(page, key);
    await d.getByRole('button', { name: 'كل بنود الغرفة سليمة' }).click();
    await expect(d.getByText(/^\d+\/\d+$/)).toContainText(/^(\d+)\/\1$/);
  }
}

async function takePhoto(page: Page, itemTestId: string) {
  const item = page.getByTestId(itemTestId);
  await item.getByTestId('camera-open').click();
  const shutter = page.getByTestId('camera-shutter');
  await expect(shutter).toBeEnabled({ timeout: 15_000 });
  await shutter.click();
  await expect(item.getByTestId('evidence')).toHaveCount(1, { timeout: 30_000 });
}

/** With SHOTS=1, saves desktop and phone-width screenshots of the current state (docs/screenshots/phase5). */
async function shot(page: Page, name: string, target?: Locator) {
  if (!process.env.SHOTS) return;
  mkdirSync('../../docs/screenshots/phase5', { recursive: true });
  for (const [tag, size] of [
    ['desktop', { width: 1280, height: 800 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(size);
    await target?.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `../../docs/screenshots/phase5/${name}-${tag}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

/** At phone width nothing may push the page sideways; names the offenders when something does. */
async function noHorizontalScroll(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const r = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const clipped = (e: Element) => {
      // anything inside a horizontally scrollable or clipping box may be wider than the screen
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const wide = [...document.querySelectorAll('body *')].filter((e) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && (b.right > w + 1 || b.left < -1);
    });
    const offenders = wide
      .filter((e) => !clipped(e))
      .slice(0, 6)
      .map((e) => {
        const b = e.getBoundingClientRect();
        return `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 70)} [${Math.round(b.left)}..${Math.round(b.right)}] pos=${getComputedStyle(e).position}`;
      });
    return { w, scrollWidth: document.documentElement.scrollWidth, offenders };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(r.offenders).toEqual([]);
  expect(r.scrollWidth).toBeLessThanOrEqual(r.w);
}
async function noA11yViolations(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    r.violations.map((v) => `: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
}

async function signAs(page: Page, party: 'owner' | 'tenant') {
  await page.getByTestId(`sign-${party}`).click();
  await page.locator('#sign-password').fill(PASSWORD);
  await page.getByTestId('sign-confirm').click();
}

test('inspections: evidence with hashes, tamper blocked, two signatures seal it, move-out comparison, health record', async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(420_000);
  const stamp = Date.now();
  const ownerEmail = `insp-owner-${stamp}@rasikh.test`;
  const tenantEmail = `insp-tenant-${stamp}@rasikh.test`;
  const geo = {
    geolocation: { latitude: 24.7136, longitude: 46.6753 },
    permissions: ['geolocation'],
  };

  // ------------------------------------------------------------- owner sets up the lease
  const oCtx = await browser.newContext(geo);
  const o = await oCtx.newPage();
  await onboardOwner(o, ownerEmail);
  await addPropertyUnitLease(o, {
    tenantEmail,
    property: 'برج الفحص',
    unit: 'شقة 5',
    ejarNo: 'INSP-2026-01',
  });

  // ------------------------------------------------------------- move-in
  await o.getByRole('tab', { name: 'الفحوصات' }).click();
  await o.getByLabel('العقد', { exact: true }).selectOption({ index: 1 });
  await o.getByLabel('عدد غرف النوم').fill('1');
  await o.getByRole('button', { name: 'ابدأ فحصاً' }).click();
  await expect(o.getByTestId('inspection-editor')).toBeVisible();
  await expect(o.getByTestId('progress')).toContainText('0 من 48');

  // signing is blocked until every item has an answer
  await expect(o.getByTestId('sign-owner')).toBeDisabled();
  await allGood(o);
  await expect(o.getByTestId('progress')).toContainText('48 من 48');

  // one defect needs a photo: taken only with the in-app camera (there is no file picker at all)
  await (await room(o, 'living')).getByLabel('الحالة').first().selectOption('damaged');
  await expect(o.locator('input[type=file]')).toHaveCount(0);
  await takePhoto(o, 'item-living__walls');
  const evidence = o.getByTestId('item-living__walls').getByTestId('evidence');
  await expect(evidence).toContainText('SHA-256');
  await expect(evidence).toContainText('الموقع مسجّل');
  await evidence.getByTestId('verify-evidence').click();
  await expect(evidence.getByTestId('verify-result')).toContainText('مطابق');

  await noA11yViolations(o);
  await noHorizontalScroll(o);
  await shot(o, '1-editor-evidence', evidence);

  // tamper with the stored file behind the app's back → the signature is refused
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
  expect((await put(forged)).ok()).toBe(true);

  await o.getByTestId('sign-owner').click();
  await shot(o, '2-sign-dialog');
  await o.locator('#sign-password').fill(PASSWORD);
  await o.getByTestId('sign-confirm').click();
  await expect(o.getByRole('alert')).toContainText('تغيّر أحد الملفات', { timeout: 30_000 });
  await o.keyboard.press('Escape');
  await evidence.getByTestId('verify-evidence').click();
  await expect(evidence.getByTestId('verify-result')).toContainText('لا يطابق');

  // restore the genuine bytes → the same signature now goes through
  expect((await put(original)).ok()).toBe(true);
  await signAs(o, 'owner');
  await expect(o.getByTestId('signed-owner')).toContainText('وقّع', { timeout: 30_000 });
  await expect(o.getByTestId('sign-panel')).toContainText('بانتظار التوقيع');
  await expect(o.getByTestId('sign-owner')).toHaveCount(0);

  // ------------------------------------------------------------- tenant reviews and signs
  const tCtx = await browser.newContext();
  const t = await tCtx.newPage();
  await tenantJoins(t, request, tenantEmail);
  await t.getByTestId('inspection-move_in').click();
  await expect(t.getByTestId('sign-panel')).toContainText('بانتظار التوقيع');
  await expect(t.getByTestId('item-living__walls')).toContainText('تالف');
  await expect(t.getByTestId('sign-tenant')).toBeVisible();
  await t.getByLabel('ملاحظات المستأجر').fill('أوافق مع ملاحظة الجدار');
  await t.getByRole('button', { name: 'احفظ الملاحظة' }).click();
  await expect(t.getByText('تم الحفظ.')).toBeVisible();
  await signAs(t, 'tenant');
  await expect(t.getByTestId('sign-panel')).toContainText('موثّق ومقفل', { timeout: 30_000 });
  await expect(t.getByTestId('sealed-note')).toContainText('بصمة المحتوى');
  await shot(t, '3-sealed', t.getByTestId('sign-panel'));
  const digest = await t.getByTestId('sealed-note').locator('code').innerText();

  // the owner sees the same sealed record, and nothing can be edited any more
  await o.reload();
  await o.getByRole('tab', { name: 'الفحوصات' }).click();
  await o.getByTestId('inspection-move_in').click();
  await expect(o.getByTestId('sealed-note').locator('code')).toHaveText(digest);
  await expect(o.getByTestId('tenant-comment')).toContainText('أوافق مع ملاحظة الجدار');
  await expect(o.getByTestId('camera-open')).toHaveCount(0);
  await expect(o.getByLabel('الحالة')).toHaveCount(0);

  // ------------------------------------------------------------- move-out and comparison
  await o.getByRole('button', { name: 'رجوع' }).click();
  await o.getByLabel('العقد', { exact: true }).selectOption({ index: 1 });
  await o.getByLabel('نوع الفحص').selectOption('move_out');
  await expect(o.getByText('سيُقارَن هذا الفحص بفحص الاستلام الموثّق.')).toBeVisible();
  await o.getByLabel('عدد غرف النوم').fill('1');
  await o.getByRole('button', { name: 'ابدأ فحصاً' }).click();
  await expect(o.getByTestId('inspection-editor')).toBeVisible();
  await allGood(o);

  // the kitchen sink got worse since move-in: the owner decides, the app does not
  const sink = (await room(o, 'kitchen')) && o.getByTestId('item-kitchen__sink');
  await sink.getByLabel('الحالة').selectOption('poor');
  await expect(sink.getByTestId('assessment')).toBeVisible();
  await sink.getByLabel('التقييم').selectOption('damage');
  await sink.getByLabel('التكلفة (ر.س)').fill('350');
  await sink.getByLabel('التكلفة (ر.س)').blur();
  await takePhoto(o, 'item-kitchen__sink');

  const report = o.getByTestId('compare-report');
  await expect(report.getByTestId('cmp-kitchen__sink')).toContainText('رديء');
  await expect(report.getByTestId('damage-total')).toContainText('350');
  await expect(report.getByTestId('pending-assessment')).toHaveText('0');
  await noA11yViolations(o);
  await noHorizontalScroll(o);

  await signAs(o, 'owner');
  await expect(o.getByTestId('signed-owner')).toContainText('وقّع', { timeout: 30_000 });
  await t.reload();
  await t.getByRole('button', { name: /فحص التسليم/ }).click();
  await signAs(t, 'tenant');
  await expect(t.getByTestId('sign-panel')).toContainText('موثّق ومقفل', { timeout: 30_000 });
  await expect(t.getByTestId('compare-report').getByTestId('damage-total')).toContainText('350');
  await noHorizontalScroll(t);
  await shot(t, '4-compare-report', t.getByTestId('compare-report'));

  // ------------------------------------------------------------- Property Health Record
  await o.reload();
  await o.getByRole('tab', { name: 'سجل العقار' }).click();
  const record = o.getByTestId('health-record');
  await expect(record).toContainText('فحص استلام موثّق');
  await expect(record).toContainText('فحص تسليم موثّق');
  await expect(record).toContainText('بداية عقد');
  await noA11yViolations(o);
  await noHorizontalScroll(o);
  await shot(o, '5-health-record', record);

  await oCtx.close();
  await tCtx.close();
});
