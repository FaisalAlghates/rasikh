import type { MetadataRoute } from 'next';
import { LOCALES, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const private_ = LOCALES.flatMap((l) =>
    ['workspace', 'auth', 'onboarding', 'design-lab', 'portfolio', 'admin', 'design'].map(
      (p) => `/${l}/${p}`,
    ),
  );
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: private_ }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
