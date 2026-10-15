import { redirect } from '@/i18n/navigation';

// The Riyadh-only portfolio map became the Kingdom map; old links keep working.
export default async function PortfolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/map', locale });
}
