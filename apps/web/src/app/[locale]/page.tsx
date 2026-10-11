import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Header } from '@/components/Header';
import { ShurfaDivider } from '@/components/BrandMark';
import { Link } from '@/i18n/navigation';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-24 pt-16 md:pt-28">
        <h1 className="display-font max-w-3xl text-h1 text-text md:text-d2">{t('headline')}</h1>
        <p className="max-w-xl text-h3 text-text-muted">{t('subhead')}</p>
        <div>
          <Link
            href="/auth"
            className="inline-flex min-h-12 items-center rounded-md bg-brand px-7 text-body font-medium text-on-brand transition-colors duration-200 hover:brightness-110"
          >
            {t('start')}
          </Link>
        </div>
        <ShurfaDivider className="mt-10 text-brand-text opacity-60" />
      </main>
    </>
  );
}
