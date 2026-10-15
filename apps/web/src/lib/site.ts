/** Public origin used for canonical links, the sitemap and social cards. Set NEXT_PUBLIC_SITE_URL once the domain is owned. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rasikh.sa').replace(
  /\/$/,
  '',
);

/** Pages a search engine may index (everything behind sign-in is excluded in robots and with noindex). */
export const PUBLIC_PATHS = [
  '',
  '/map',
  '/engineering',
  '/about',
  '/help',
  '/contact',
  '/sitemap',
  '/accessibility',
  '/privacy',
  '/terms',
  '/disclaimers',
] as const;
export const LOCALES = ['ar', 'en'] as const;

export const localeUrl = (locale: string, path: string) => `${SITE_URL}/${locale}${path}`;
