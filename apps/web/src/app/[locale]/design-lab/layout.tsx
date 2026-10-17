import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';
import { ToastProvider } from '@/components/ui/Toast';

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // the locale is set here as well as in the page, so a static export never has to read request headers
  setRequestLocale((await params).locale);
  return (
    <ClientMessages namespaces={['common', 'nav', 'lab', 'eng']}>
      <ToastProvider>{children}</ToastProvider>
    </ClientMessages>
  );
}
