import { Home, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/BrandMark';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { Link } from '@/i18n/navigation';
import { ROUTES, type PageKey } from '@/lib/nav';

const POPULAR: PageKey[] = ['map', 'help', 'contact', 'sitemap'];

/** DGA page-not-found: a friendly message, a clear way home, search, and a few useful links. */
export default function NotFound() {
  const t = useTranslations('pages.notFound');
  const nav = useTranslations('nav');
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="rk-container py-16 outline-none md:py-24">
        <div className="flex max-w-[45rem] flex-col items-start gap-6">
          <span className="text-brand-text" aria-hidden="true">
            <BrandMark size={56} />
          </span>
          <p className="text-small font-semibold text-brand-text">{t('code')}</p>
          <h1 className="display-font text-h1 md:text-d2">{t('title')}</h1>
          <p className="text-h3 font-normal text-text-muted">{t('body')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={ROUTES.home}
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-brand px-6 text-body font-semibold text-on-brand hover:brightness-110"
            >
              <Home size={18} aria-hidden="true" />
              {t('home')}
            </Link>
            <Link
              href={ROUTES.search}
              className="hairline inline-flex min-h-12 items-center gap-2 rounded-md px-6 text-body text-text hover:bg-surface"
            >
              <Search size={18} aria-hidden="true" />
              {t('search')}
            </Link>
          </div>
          <nav aria-labelledby="nf-popular" className="mt-6 w-full">
            <h2 id="nf-popular" className="mb-3 text-small font-semibold text-text-muted">
              {t('popular')}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {POPULAR.map((k) => (
                <li key={k}>
                  <Link
                    href={ROUTES[k]}
                    className="hairline flex flex-col gap-1 rounded-xl bg-surface p-4 hover:border-brand"
                  >
                    <span className="text-body font-semibold">{nav(k)}</span>
                    <span className="line-clamp-2 text-small text-text-muted">
                      {nav(`desc.${k}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
