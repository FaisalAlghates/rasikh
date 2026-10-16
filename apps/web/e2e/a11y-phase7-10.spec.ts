import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { onboardOwner, signUpEmail } from './helpers';

const SHOTS = '../../docs/screenshots/phase7-10';

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

test('a11y + screenshots: the legal pages', async ({ page }, info) => {
  for (const path of ['privacy', 'terms', 'disclaimers']) {
    await page.goto(`/ar/${path}`);
    await expect(page.getByTestId('legal-draft')).toBeVisible();
    await page.screenshot({
      path: `${SHOTS}/${info.project.name}-legal-${path}.png`,
      fullPage: true,
    });
    expect(await axe(page), `${path} page`).toEqual([]);
  }
});

test('a11y + screenshots: broker workspace, assistant and privacy panels', async ({
  browser,
  isMobile,
}, info) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({
    viewport: isMobile ? { width: 412, height: 915 } : undefined,
  });
  const p = await ctx.newPage();
  const stamp = Date.now();

  // A broker account: lands straight on the brokerage workspace.
  await signUpEmail(p, `a11y-broker-${stamp}@rasikh.test`);
  await expect(p).toHaveURL(/\/ar\/onboarding/, { timeout: 45_000 });
  await p.getByRole('button', { name: /الوساطة العقارية/ }).click();
  await p.locator('#displayName').fill('سلمان');
  await p.locator('#orgName').fill('مكتب الأفق');
  await p.locator('input[type=checkbox]').last().check();
  await p.locator('main button').last().click();
  await expect(p.getByTestId('broker-view')).toBeVisible({ timeout: 45_000 });
  await p.screenshot({ path: `${SHOTS}/${info.project.name}-broker.png`, fullPage: true });
  expect(await axe(p), 'broker workspace').toEqual([]);

  // An owner: assistant (with an answer showing) and privacy tabs.
  const o = await (
    await browser.newContext({ viewport: isMobile ? { width: 412, height: 915 } : undefined })
  ).newPage();
  await onboardOwner(o, `a11y-owner-${stamp}@rasikh.test`);
  await o.getByRole('tab', { name: 'المساعد' }).click();
  await o.locator('#ai-q').fill('كم عقداً عندي؟');
  await o.getByRole('button', { name: 'اسأل', exact: true }).click();
  await expect(o.getByTestId('ai-answer')).toBeVisible({ timeout: 30_000 });
  await o.screenshot({ path: `${SHOTS}/${info.project.name}-assistant.png`, fullPage: true });
  expect(await axe(o), 'assistant').toEqual([]);

  await o.getByRole('tab', { name: 'خصوصيتي' }).click();
  await expect(o.getByTestId('privacy-panel')).toBeVisible();
  await o.screenshot({ path: `${SHOTS}/${info.project.name}-privacy.png`, fullPage: true });
  expect(await axe(o), 'privacy panel').toEqual([]);
});
