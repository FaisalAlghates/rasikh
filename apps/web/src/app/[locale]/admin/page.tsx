import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { AdminInbox } from '@/components/admin/AdminInbox';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';

export default function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="main" tabIndex={-1} className="rk-container pb-24 outline-none">
        <AdminInbox />
      </main>
      <SiteFooter />
    </>
  );
}
