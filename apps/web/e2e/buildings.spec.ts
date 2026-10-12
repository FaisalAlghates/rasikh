import { expect, test } from '@playwright/test';
import { onboardOwner } from './helpers';

test('buildings: members, receipt-backed expense, balances, quotes, vote and monthly statement', async ({
  browser,
  isMobile,
}) => {
  test.skip(isMobile, 'long desktop flow');
  test.setTimeout(180_000);
  const ctx = await browser.newContext();
  const o = await ctx.newPage();
  await onboardOwner(o, `bd-owner-${Date.now()}@rasikh.test`);
  await o.getByRole('tab', { name: 'العمارات والجمعيات' }).click();
  await o.getByLabel('اسم العمارة').fill('عمارة الجمعية');
  await o.getByRole('button', { name: 'أضف عمارة' }).click();
  await expect(o.getByTestId('building-board')).toBeVisible({ timeout: 20_000 });

  const addMember = async (name: string, unit: string, share: string) => {
    await o.getByLabel('اسم المالك', { exact: true }).first().fill(name);
    await o.getByLabel('الوحدة', { exact: true }).fill(unit);
    await o.getByLabel('النصيب من المصاريف (%)').fill(share);
    await o.getByRole('button', { name: 'أضف مالكاً' }).click();
    await expect(o.locator('#bm-name')).toHaveValue(''); // the form clears once the write is done
  };
  await addMember('سالم', '1', '60');
  await addMember('نورة', '2', '40');
  await expect(o.getByTestId('member-row')).toHaveCount(2);

  // an expense without a receipt is refused; with one it enters the ledger
  await o.getByLabel('البيان').fill('صيانة المصعد');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).first().fill('1000');
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByText('أرفق إيصال المصروف.')).toBeVisible();
  await o
    .locator('#be-receipt')
    .setInputFiles({ name: 'r.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await o.getByRole('button', { name: 'أضف مصروفاً' }).click();
  await expect(o.getByTestId('bexpense-row')).toHaveCount(1, { timeout: 20_000 });
  await expect(o.getByTestId('balance-1')).toContainText('المستحق 600');
  await expect(o.getByTestId('balance-2')).toContainText('المستحق 400');

  await o.getByLabel('المبلغ (ر.س)', { exact: true }).nth(1).fill('250');
  await o.locator('#bc-member').selectOption({ label: 'سالم · 1' });
  await o.getByRole('button', { name: 'سجّل دفعة' }).click();
  await expect(o.getByTestId('balance-1')).toContainText('المتبقي 350', { timeout: 20_000 });

  // quotes: cheapest first
  await o.getByLabel('العرض لأجل').fill('طلاء الواجهة');
  await o.getByLabel('المورّد').fill('شركة أ');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).nth(2).fill('5200');
  await o.getByRole('button', { name: 'أضف عرضاً' }).click();
  await expect(o.getByTestId('quote-cheapest')).toContainText('شركة أ', { timeout: 20_000 });
  await o.getByLabel('المورّد').fill('شركة ب');
  await o.getByLabel('المبلغ (ر.س)', { exact: true }).nth(2).fill('4800');
  await o.getByRole('button', { name: 'أضف عرضاً' }).click();
  await expect(o.getByTestId('quote-cheapest')).toContainText('شركة ب', { timeout: 20_000 });
  await expect(o.getByTestId('quote-other')).toContainText('+400');

  // vote: both units say yes → majority passes
  await o.getByLabel('موضوع التصويت').fill('اعتماد عرض الطلاء');
  await o.getByRole('button', { name: 'أنشئ تصويتاً' }).click();
  await expect(o.getByTestId('vote-box')).toBeVisible({ timeout: 20_000 });
  await expect(o.getByTestId('vote-result')).toContainText('مفتوح');
  await o.getByTestId('vote-box').getByRole('button', { name: 'موافق', exact: true }).click();
  await expect(o.getByTestId('vote-result')).toContainText('موافق 1', { timeout: 20_000 });
  await o.getByTestId('vote-box').getByRole('button', { name: 'موافق', exact: true }).click();
  await expect(o.getByTestId('vote-result')).toContainText('أُقرّ', { timeout: 20_000 });

  // monthly statement
  await expect(o.getByTestId('stmt-expenses')).toContainText('1,000');
  await expect(o.getByTestId('stmt-contributions')).toContainText('250');
  await expect(o.getByTestId('stmt-net')).toContainText('-750');
  await ctx.close();
});
