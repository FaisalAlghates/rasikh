import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClientMessages } from '@/components/ClientMessages';
import { ContentPage } from '@/components/shell/ContentPage';
import { SearchPage } from '@/components/shell/SearchPage';
import { pageMetadata, searchIndex } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // results pages are not indexed; the pages they point to are
  return pageMetadata((await params).locale, 'search', { index: false });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pages.search' });
  const docs = await searchIndex(locale);
  return (
    <ContentPage title={t('title')} lead={t('lead')} feedback={false}>
      <ClientMessages namespaces={['common', 'nav', 'pages']}>
        <SearchPage docs={docs} />
      </ClientMessages>
    </ContentPage>
  );
}
