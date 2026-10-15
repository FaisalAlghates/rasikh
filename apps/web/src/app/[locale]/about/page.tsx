import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ContentPage } from '@/components/shell/ContentPage';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/content';
import { ROUTES } from '@/lib/nav';

type Item = { h: string; p: string };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'about');
}

export default function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('pages.about');
  const nav = useTranslations('nav');
  const problems = t.raw('problems') as Item[];
  const who = t.raw('who') as Item[];
  const principles = t.raw('principles') as Item[];

  return (
    <ContentPage title={t('title')} lead={t('lead')} wide>
      <section aria-labelledby="ab-problems" className="flex flex-col gap-6">
        <h2 id="ab-problems" className="text-h2 font-semibold">
          {t('problemsTitle')}
        </h2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((p, i) => (
            <li key={p.h} className="hairline flex flex-col gap-2 rounded-xl bg-surface p-6">
              <span className="display-font text-h2 text-brand-text" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-h3 font-semibold">{p.h}</h3>
              <p className="text-body text-text-muted">{p.p}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ab-who" className="mt-16 grid gap-8 lg:grid-cols-[1fr_2fr]">
        <h2 id="ab-who" className="text-h2 font-semibold">
          {t('whoTitle')}
        </h2>
        <dl className="flex flex-col divide-y divide-border/20">
          {who.map((w) => (
            <div key={w.h} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
              <dt className="text-body font-semibold">{w.h}</dt>
              <dd className="text-body text-text-muted">{w.p}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="ab-principles" className="mt-16 flex flex-col gap-6">
        <h2 id="ab-principles" className="text-h2 font-semibold">
          {t('principlesTitle')}
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {principles.map((p) => (
            <li key={p.h} className="flex gap-4 border-s-2 border-brand ps-5">
              <div className="flex flex-col gap-1">
                <h3 className="text-h3 font-semibold">{p.h}</h3>
                <p className="text-body text-text-muted">{p.p}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        data-theme="dark"
        aria-labelledby="ab-cta"
        className="mt-16 flex flex-col items-start gap-5 rounded-[28px] p-8 md:flex-row md:items-center md:justify-between md:p-12"
      >
        <div className="flex flex-col gap-2">
          <h2 id="ab-cta" className="display-font text-h1">
            {t('ctaTitle')}
          </h2>
          <p className="text-body text-text-muted">{t('ctaBody')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={ROUTES.auth}
            className="inline-flex min-h-12 items-center rounded-md bg-brand px-6 text-body font-semibold text-on-brand hover:brightness-110"
          >
            {nav('start')}
          </Link>
          <Link
            href={ROUTES.map}
            className="hairline inline-flex min-h-12 items-center gap-2 rounded-md px-6 text-body text-text hover:bg-surface"
          >
            {t('ctaMap')}
            <ArrowLeft size={16} aria-hidden="true" className="ltr:rotate-180" />
          </Link>
        </div>
      </section>
    </ContentPage>
  );
}
