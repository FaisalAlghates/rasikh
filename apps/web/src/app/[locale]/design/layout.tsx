import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';

// Design projects are private to the client and the office: never indexed.
export const metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientMessages namespaces={['common', 'nav', 'eng', 'cities']}>{children}</ClientMessages>
  );
}
