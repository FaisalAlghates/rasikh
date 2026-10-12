import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { use } from 'react';
import { LegalPage } from '@/components/LegalPage';
import { localeUrl } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return { title: t('terms.title'), alternates: { canonical: localeUrl(locale, '/terms') } };
}

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  return <LegalPage locale={locale} kind="terms" />;
}
