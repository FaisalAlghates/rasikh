import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Header } from '@/components/Header';
import { LabSections } from '@/components/lab/LabSections';

export const metadata = { robots: { index: false, follow: false } };

export default function DesignLabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('lab');

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <h1 className="display-font text-h1">{t('title')}</h1>
        <p className="mt-2 max-w-xl text-text-muted">{t('intro')}</p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {(['light', 'dark'] as const).map((mode) => (
            <div key={mode} data-theme={mode} className="hairline rounded-xl p-6 md:p-8">
              <LabSections />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
