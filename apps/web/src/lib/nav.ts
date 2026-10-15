/**
 * The site's information architecture in one place. The header, footer, sitemap page, search and
 * breadcrumbs all read from here, so every page is reachable from every other page.
 * Labels live in the `nav` messages under the same keys.
 */
export const ROUTES = {
  home: '/',
  map: '/map',
  about: '/about',
  help: '/help',
  contact: '/contact',
  search: '/search',
  sitemap: '/sitemap',
  accessibility: '/accessibility',
  privacy: '/privacy',
  terms: '/terms',
  disclaimers: '/disclaimers',
  auth: '/auth',
  workspace: '/workspace',
} as const;

export type PageKey = keyof typeof ROUTES;

/** Top navigation (DGA navigation header: few, clear destinations). */
export const HEADER_NAV: PageKey[] = ['home', 'map', 'about', 'help', 'contact'];

/** Footer groups (DGA footer: group labels, links, accessibility tools, legal text). */
export const FOOTER_GROUPS: Array<{ label: string; items: PageKey[] }> = [
  { label: 'groupPlatform', items: ['home', 'map', 'about', 'workspace'] },
  { label: 'groupSupport', items: ['help', 'contact', 'search', 'sitemap'] },
  { label: 'groupLegal', items: ['privacy', 'terms', 'disclaimers', 'accessibility'] },
];

/** The sitemap page lists every public destination, grouped like the footer. */
export const SITEMAP_GROUPS: Array<{ label: string; items: PageKey[] }> = [
  { label: 'groupPlatform', items: ['home', 'map', 'about', 'auth', 'workspace'] },
  { label: 'groupSupport', items: ['help', 'contact', 'search', 'sitemap'] },
  { label: 'groupLegal', items: ['privacy', 'terms', 'disclaimers', 'accessibility'] },
];

/** Pages offered by site search (each has `nav.<key>` and `nav.desc.<key>`). */
export const SEARCHABLE: PageKey[] = [
  'home',
  'map',
  'about',
  'help',
  'contact',
  'sitemap',
  'accessibility',
  'privacy',
  'terms',
  'disclaimers',
  'auth',
  'workspace',
];

/** Is `href` the current page (or a parent of it)? Used for aria-current in navigation. */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Arabic-aware normalisation for search: drops diacritics/tatweel and unifies alef, ya and ta marbuta. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchDoc {
  id: string;
  title: string;
  body: string;
  href: string;
  /** Where the result lives, e.g. "مركز المساعدة". */
  section: string;
}

/** Ranks documents for a query: every word must match; title hits rank above body hits. */
export function searchDocs(docs: SearchDoc[], query: string, limit = 50): SearchDoc[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const scored: Array<{ d: SearchDoc; s: number }> = [];
  for (const d of docs) {
    const title = normalize(d.title);
    const body = normalize(`${d.body} ${d.section}`);
    let s = 0;
    let all = true;
    for (const w of words) {
      if (title.startsWith(w)) s += 6;
      else if (title.includes(w)) s += 4;
      else if (body.includes(w)) s += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ d, s });
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.d);
}
