import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SHOTS = '../../docs/screenshots/engineering';

test('the four design languages: the same brief drawn as Najdi, modern, Swiss and palace', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'one viewport is enough');
  await page.goto('/ar/design-lab/styles');
  const gallery = page.getByTestId('style-gallery');
  await expect(gallery.locator('section')).toHaveCount(4);
  const looks = await gallery
    .locator('svg[data-look]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-look')));
  expect(looks).toEqual(['najdi', 'modern', 'swiss', 'palace']);
  // a palace has its dome and portico; a Swiss house a pitched roof (a path over the top floor)
  await expect(gallery.locator('[data-style="palace"] [data-testid="dome"]')).toHaveCount(1);
  await expect(
    gallery.locator('[data-style="palace"] [data-testid="portico"]').first(),
  ).toBeVisible();
  await expect(gallery.locator('[data-style="najdi"] [data-testid="dome"]')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/desktop-styles.png`, fullPage: true });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
});

test('hovering a design shows it as a 3D model that turns with the pointer', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'pointer hover is a desktop interaction');
  test.setTimeout(180_000);
  await page.goto('/ar/design-lab/styles');
  for (const style of ['swiss', 'palace']) {
    const card = page.locator(`[data-style="${style}"] [data-3d]`);
    await card.hover();
    await expect(card).toHaveAttribute('data-3d', 'on');
    await expect(card.getByTestId('hover-3d').locator('canvas')).toBeVisible();
    // move across it: the camera follows
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 8 });
    await page.waitForTimeout(1500);
    await card.screenshot({ path: `../../docs/screenshots/engineering/desktop-3d-${style}.png` });
    await page.mouse.move(0, 0);
    await expect(card).toHaveAttribute('data-3d', 'off');
  }
  // keyboard and touch: the button toggles it
  const najdi = page.locator('[data-style="modern_najdi"] [data-3d]');
  await najdi.getByRole('button', { name: 'مجسم ثلاثي الأبعاد' }).click();
  await expect(najdi.getByTestId('hover-3d')).toBeVisible();
});
