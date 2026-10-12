import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';

export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages namespaces={['common', 'onboarding', 'ops']}>{children}</ClientMessages>;
}
