import { Dashboard } from '@/components/ops/Dashboard';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';

export default function WorkspacePage() {
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
