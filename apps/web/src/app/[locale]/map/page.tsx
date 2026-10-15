import { setRequestLocale } from 'next-intl/server';
import { ClientMessages } from '@/components/ClientMessages';
import { MapClient } from '@/components/map/MapClient';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { pageMetadata } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'map');
}

/** The Kingdom map: dark by default (map screens), the whole Kingdom first, then any city. */
export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div data-theme="dark" className="min-h-dvh">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <ClientMessages namespaces={['common', 'nav', 'portfolio', 'cities']}>
          <MapClient />
        </ClientMessages>
      </main>
      <SiteFooter />
    </div>
  );
}
