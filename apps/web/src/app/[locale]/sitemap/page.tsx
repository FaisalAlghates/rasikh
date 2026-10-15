import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ContentPage } from '@/components/shell/ContentPage';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/content';
import { ROUTES, SITEMAP_GROUPS } from '@/lib/nav';

const ROLES = ['owner', 'tenant', 'building_owner', 'broker', 'vendor'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'sitemap');
}

/** DGA sitemap page: every destination, grouped, with a short description; plus the workspace by role. */
export default function SitemapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('pages.sitemap');
  const nav = useTranslations('nav');
  return (
    <ContentPage title={t('title')} lead={t('lead')} wide>
      <div className="grid gap-10 md:grid-cols-3">
        {SITEMAP_GROUPS.map((g) => (
          <section key={g.label} aria-labelledby={`sm-${g.label}`}>
            <h2
              id={`sm-${g.label}`}
              className="mb-4 border-b border-border/20 pb-2 text-h3 font-semibold"
            >
              {nav(g.label)}
            </h2>
            <ul className="flex flex-col gap-4">
              {g.items.map((k) => (
                <li key={k}>
                  <Link
                    href={ROUTES[k]}
                    className="text-body font-semibold text-brand-text underline-offset-4 hover:underline"
                  >
                    {nav(k)}
                  </Link>
                  <p className="text-small text-text-muted">{nav(`desc.${k}`)}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section aria-labelledby="sm-roles" className="mt-14 max-w-[45rem]">
        <h2 id="sm-roles" className="text-h3 font-semibold">
          {t('rolesTitle')}
        </h2>
        <p className="mb-4 text-small text-text-muted">{t('rolesNote')}</p>
        <dl className="hairline divide-y divide-border/20 rounded-xl bg-surface">
          {ROLES.map((r) => (
            <div key={r} className="grid gap-1 p-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-small font-semibold">{nav(`role.${r}`)}</dt>
              <dd className="text-small text-text-muted">{t(`roleDesc.${r}`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </ContentPage>
  );
}
