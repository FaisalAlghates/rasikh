import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';

// Design projects are private to the client and the office: never indexed.
export const metadata = { robots: { index: false, follow: false } };

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
    <ClientMessages namespaces={['common', 'nav', 'eng', 'cities']}>{children}</ClientMessages>
  );
}
