import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DesignHome } from '@/components/eng/DesignHome';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';

export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'eng' });
  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="main" tabIndex={-1} className="rk-container pb-24 outline-none">
        <Breadcrumbs
          items={[{ label: t('title'), href: '/engineering' }, { label: t('myProjects') }]}
        />
        <header className="mb-8 flex max-w-[45rem] flex-col gap-2 pt-2">
          <h1 className="display-font text-h1">{t('myProjects')}</h1>
          <p className="text-body text-text-muted">{t('myProjectsLead')}</p>
        </header>
        <DesignHome />
      </main>
      <SiteFooter />
    </>
  );
}
