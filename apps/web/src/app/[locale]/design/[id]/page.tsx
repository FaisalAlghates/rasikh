import { setRequestLocale } from 'next-intl/server';
import { ProjectView } from '@/components/eng/ProjectView';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';

// A static export needs at least one known id; real project ids are read in the browser.
export function generateStaticParams() {
  return ['ar', 'en'].map((locale) => ({ locale, id: 'demo' }));
}

export default async function DesignProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="main" tabIndex={-1} className="rk-container pb-24 outline-none">
        <ProjectView pid={id} />
      </main>
      <SiteFooter />
    </>
  );
}
