import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ContentPage } from '@/components/shell/ContentPage';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/content';
import { ROUTES } from '@/lib/nav';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'accessibility');
}

export default function AccessibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('pages.accessibility');
  const nav = useTranslations('nav');
  const sections = t.raw('sections') as Array<{ h: string; p: string }>;
  return (
    <ContentPage title={t('title')} lead={t('lead')}>
      <div className="flex max-w-[45rem] flex-col gap-8">
        {sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-2">
            <h2 className="text-h3 font-semibold">{s.h}</h2>
            <p className="text-body">{s.p}</p>
          </section>
        ))}
        <p className="text-small text-text-muted">{t('reviewed')}</p>
        <Link
          href={ROUTES.contact}
          className="inline-flex min-h-11 items-center self-start rounded-md bg-brand px-5 text-small font-semibold text-on-brand hover:brightness-110"
        >
          {nav('contact')}
        </Link>
      </div>
    </ContentPage>
  );
}
