import { BookOpen, FileText, ShieldCheck } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClientMessages } from '@/components/ClientMessages';
import { ContactForm } from '@/components/shell/ContactForm';
import { ContentPage } from '@/components/shell/ContentPage';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/content';
import { ROUTES } from '@/lib/nav';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata((await params).locale, 'contact');
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pages.contact' });
  const nav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <ContentPage title={t('title')} lead={t('lead')} wide>
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <ClientMessages namespaces={['common', 'nav', 'pages']}>
          <ContactForm />
        </ClientMessages>
        <aside aria-labelledby="before-title" className="flex flex-col gap-4">
          <h2 id="before-title" className="text-h3 font-semibold">
            {t('beforeTitle')}
          </h2>
          <ul className="flex flex-col gap-3">
            <li className="hairline flex gap-3 rounded-xl bg-surface p-4">
              <BookOpen size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-text" />
              <p className="text-small">
                {t('beforeHelp')}{' '}
                <Link href={ROUTES.help} className="text-brand-text underline underline-offset-4">
                  {nav('help')}
                </Link>
              </p>
            </li>
            <li className="hairline flex gap-3 rounded-xl bg-surface p-4">
              <FileText size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-text" />
              <p className="text-small">{t('beforeEjar')}</p>
            </li>
            <li className="hairline flex gap-3 rounded-xl bg-surface p-4">
              <ShieldCheck
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-brand-text"
              />
              <p className="text-small">
                {t('beforePrivacy')}{' '}
                <Link
                  href={ROUTES.privacy}
                  className="text-brand-text underline underline-offset-4"
                >
                  {nav('privacy')}
                </Link>
              </p>
            </li>
          </ul>
        </aside>
      </div>
    </ContentPage>
  );
}
