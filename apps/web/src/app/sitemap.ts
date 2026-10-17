import type { MetadataRoute } from 'next';
import { LOCALES, PUBLIC_PATHS, localeUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: localeUrl(locale, path),
      changeFrequency: path === '' ? ('weekly' as const) : ('yearly' as const),
      priority: path === '' ? 1 : 0.4,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, localeUrl(l, path)])),
      },
    })),
  );
}
