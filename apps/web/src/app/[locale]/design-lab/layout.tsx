import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';
import { ToastProvider } from '@/components/ui/Toast';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientMessages namespaces={['common', 'lab']}>
      <ToastProvider>{children}</ToastProvider>
    </ClientMessages>
  );
}
