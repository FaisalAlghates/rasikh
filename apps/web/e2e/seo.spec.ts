import { expect, test } from '@playwright/test';

test('seo: robots.txt hides signed-in pages and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain('Disallow: /ar/workspace');
  expect(body).toContain('Disallow: /en/auth');
  expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

test('seo: the sitemap lists the public pages in both languages with alternates', async ({
  request,
}) => {
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBe(true);
  const xml = await res.text();
  for (const l of ['ar', 'en']) {
    for (const p of ['', '/privacy', '/terms', '/disclaimers']) {
      expect(xml).toContain(`/${l}${p}</loc>`);
    }
  }
  expect(xml).toContain('hreflang="ar"');
  expect(xml).not.toContain('/workspace');
});

test('seo: the landing page has a canonical link, hreflang alternates and a social card', async ({
  page,
}) => {
  await page.goto('/ar');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/ar$/);
  await expect(page.locator('link[rel=alternate][hreflang=en]')).toHaveAttribute('href', /\/en$/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ar_SA');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /راسخ/);
  await expect(page.locator('meta[name=robots][content*=noindex]')).toHaveCount(0);
});

test('seo: sign-in and workspace pages are marked noindex', async ({ page }) => {
  for (const path of ['/ar/auth', '/ar/workspace']) {
    await page.goto(path);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  }
});
