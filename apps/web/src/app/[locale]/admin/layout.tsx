import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';

// The Rasikh team inbox is never indexed.
export const metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages namespaces={['common', 'nav', 'admin', 'eng']}>{children}</ClientMessages>;
}
