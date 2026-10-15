import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ContentPage } from '@/components/shell/ContentPage';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/content';
import { ROUTES } from '@/lib/nav';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'engineering');
}

/** The AI engineering office explained: who it is for, how it works, and the lines it never crosses. */
export default function EngineeringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('eng');
  const how = t.raw('how') as Array<{ h: string; p: string }>;
  const principles = t.raw('principles') as string[];
  return (
    <ContentPage title={t('title')} lead={t('pageLead')} wide>
      <div className="grid gap-4 md:grid-cols-2">
        {(['forOffices', 'forClients'] as const).map((k) => (
          <section
            key={k}
            className="hairline flex flex-col gap-2 rounded-xl bg-surface p-6"
            aria-labelledby={`e-${k}`}
          >
            <h2 id={`e-${k}`} className="text-h3 font-semibold">
              {t(`${k}Title`)}
            </h2>
            <p className="text-body text-text-muted">{t(`${k}Body`)}</p>
          </section>
        ))}
      </div>
      <section aria-labelledby="e-how" className="mt-12 flex flex-col gap-4">
        <h2 id="e-how" className="text-h2 font-semibold">
          {t('howTitle')}
        </h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {how.map((s, i) => (
            <li key={s.h} className="hairline flex flex-col gap-1 rounded-xl bg-surface p-4">
              <span className="display-font text-h2 text-brand-text" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="text-body font-semibold">{s.h}</h3>
              <p className="text-small text-text-muted">{s.p}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="e-pr" className="mt-12 flex max-w-[45rem] flex-col gap-3">
        <h2 id="e-pr" className="text-h2 font-semibold">
          {t('principlesTitle')}
        </h2>
        <ul className="flex flex-col gap-2">
          {principles.map((p) => (
            <li key={p} className="border-s-2 border-brand ps-4 text-body">
              {p}
            </li>
          ))}
        </ul>
        <p className="text-small text-text-muted">{t('notStamp')}</p>
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={ROUTES.design}
          className="inline-flex min-h-12 items-center rounded-md bg-brand px-6 text-body font-semibold text-on-brand hover:brightness-110"
        >
          {t('ctaDesign')}
        </Link>
        <Link
          href="/onboarding?new=1"
          className="hairline inline-flex min-h-12 items-center rounded-md px-6 text-body text-text hover:bg-surface"
        >
          {t('ctaOffice')}
        </Link>
      </div>
    </ContentPage>
  );
}
