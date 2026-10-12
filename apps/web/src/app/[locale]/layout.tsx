import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Reem_Kufi } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClientMessages } from '@/components/ClientMessages';
import { SceneBackdrop } from '@/components/immersive/SceneBackdrop';
import { ScrollEffects } from '@/components/immersive/ScrollEffects';
import { LOCALES, SITE_URL, localeUrl } from '@/lib/site';
import { themeInitScript } from '@/lib/theme-script';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Only the Arabic display face (the headline, i.e. the LCP text) is preloaded; body faces load on demand.
const reem = Reem_Kufi({ subsets: ['arabic'], variable: '--font-reem-kufi', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
});
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  const title = `${t('appName')} · ${t('tagline')}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: t('tagline'),
    alternates: {
      canonical: localeUrl(locale, ''),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localeUrl(l, '')])),
    },
    openGraph: {
      type: 'website',
      siteName: t('appName'),
      title,
      description: t('tagline'),
      url: localeUrl(locale, ''),
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
    },
    twitter: { card: 'summary', title, description: t('tagline') },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${reem.variable} ${plexArabic.variable} ${fraunces.variable} ${plexSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ClientMessages namespaces={['common']}>
          <SceneBackdrop />
          <ScrollEffects />
          {children}
        </ClientMessages>
      </body>
    </html>
  );
}
