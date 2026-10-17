import { expect, test } from '@playwright/test';

/**
 * The real Mapbox map with the buildings on it. It needs the network and a Mapbox token, so it only runs when asked:
 * `RK_REAL_MAP=1 pnpm e2e map-real`. Saves a screenshot of a property close up.
 */
test.skip(!process.env.RK_REAL_MAP, 'needs the network and a Mapbox token');

test('the real map stands a building on a property, not a marker', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one viewport is enough');
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    (window as unknown as { __RK_FORCE_MAP: boolean }).__RK_FORCE_MAP = true;
  });
  await page.goto('/ar/map');
  const map = page.getByRole('region', { name: /خريطة/ }).first();
  await expect(map).toBeVisible({ timeout: 60_000 });
  await page.getByTestId(process.env.RK_ROW ?? 'row-p3').click();
  await page.waitForTimeout(12_000);
  const placed = await page.evaluate(() => {
    const m = (window as unknown as { __rkMap: { getLayer(id: string): unknown } }).__rkMap;
    return !!m.getLayer('houses');
  });
  expect(placed).toBe(true);
  await page.screenshot({ path: '../../docs/screenshots/shell/desktop-map-houses.png' });
});
