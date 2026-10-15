import type { ReactNode } from 'react';
import { ClientMessages } from '@/components/ClientMessages';

// Sign-in and signed-in pages are never indexed.
export const metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientMessages
      namespaces={[
        'common',
        'nav',
        'cities',
        'eng',
        'workspace',
        'onboarding',
        'ops',
        'inspect',
        'maint',
        'bldg',
        'broker',
        'ai',
        'account',
      ]}
    >
      {children}
    </ClientMessages>
  );
}
