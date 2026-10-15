import { MessageSquare } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClientMessages } from '@/components/ClientMessages';
import { ContentPage } from '@/components/shell/ContentPage';
import { HelpCenter } from '@/components/shell/HelpCenter';
import { Link } from '@/i18n/navigation';
import { faqCategories, pageMetadata } from '@/lib/content';
import { ROUTES } from '@/lib/nav';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'help');
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pages.help' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const categories = await faqCategories(locale);

  return (
    <ContentPage title={t('title')} lead={t('lead')} wide>
      <ClientMessages namespaces={['common', 'nav', 'pages']}>
        <HelpCenter categories={categories} />
      </ClientMessages>
      <aside
        aria-labelledby="still-need"
        className="hairline mt-12 flex max-w-[45rem] flex-col gap-4 rounded-xl bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <MessageSquare size={22} aria-hidden="true" className="mt-1 shrink-0 text-brand-text" />
          <div>
            <h2 id="still-need" className="text-h3 font-semibold">
              {t('stillNeed')}
            </h2>
            <p className="text-body text-text-muted">{t('stillNeedBody')}</p>
          </div>
        </div>
        <Link
          href={ROUTES.contact}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-brand px-5 text-small font-semibold text-on-brand hover:brightness-110"
        >
          {nav('contact')}
        </Link>
      </aside>
    </ContentPage>
  );
}
