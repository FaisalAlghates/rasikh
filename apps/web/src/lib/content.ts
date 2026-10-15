import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LOCALES, localeUrl } from './site';
import { ROUTES, SEARCHABLE, type SearchDoc } from './nav';

export interface FaqCategory {
  id: string;
  title: string;
  items: Array<{ q: string; a: string }>;
}

export async function faqCategories(locale: string): Promise<FaqCategory[]> {
  const t = await getTranslations({ locale, namespace: 'pages.help' });
  return t.raw('categories') as FaqCategory[];
}

/** Everything site search can find: public pages plus every help-centre question. */
export async function searchIndex(locale: string): Promise<SearchDoc[]> {
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const pages: SearchDoc[] = SEARCHABLE.map((k) => ({
    id: `page-${k}`,
    title: nav(k),
    body: nav(`desc.${k}`),
    href: ROUTES[k],
    section: nav('sitemap'),
  }));
  const faq = (await faqCategories(locale)).flatMap((c) =>
    c.items.map((it, i) => ({
      id: `faq-${c.id}-${i}`,
      title: it.q,
      body: it.a,
      href: `${ROUTES.help}#${c.id}-${i}`,
      section: `${nav('help')} · ${c.title}`,
    })),
  );
  return [...pages, ...faq];
}

/** Title, canonical and hreflang for a public page. */
export async function pageMetadata(
  locale: string,
  key: keyof typeof ROUTES,
  opts: { index?: boolean } = {},
): Promise<Metadata> {
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const path = ROUTES[key] === '/' ? '' : ROUTES[key];
  return {
    title: nav(key),
    description: nav(`desc.${key}`),
    alternates: {
      canonical: localeUrl(locale, path),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localeUrl(l, path)])),
    },
    ...(opts.index === false ? { robots: { index: false, follow: true } } : {}),
  };
}
