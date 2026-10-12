import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientMessages namespaces={['common', 'workspace', 'onboarding', 'ops', 'inspect', 'maint']}>
      {children}
    </ClientMessages>
  );
}
