import { use } from 'react';
import { LegalPage } from '@/components/LegalPage';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  return <LegalPage locale={locale} kind="terms" />;
}
