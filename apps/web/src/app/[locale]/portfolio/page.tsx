import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ClientMessages } from '@/components/ClientMessages';
import { Header } from '@/components/Header';
import { PortfolioClient } from '@/components/map/PortfolioClient';

export const metadata = { robots: { index: false, follow: false } };

export default function PortfolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <ClientMessages namespaces={['common', 'portfolio']}>
      <div data-theme="dark" className="min-h-dvh">
        <Header />
        <main>
          <PortfolioClient />
        </main>
      </div>
    </ClientMessages>
  );
}
