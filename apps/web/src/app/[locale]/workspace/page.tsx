import { setRequestLocale } from 'next-intl/server';
import { Dashboard } from '@/components/ops/Dashboard';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';

export default async function WorkspacePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="main" tabIndex={-1} className="rk-container pb-24 outline-none">
        <Dashboard />
      </main>
      <SiteFooter />
    </>
  );
}
