import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Header } from '@/components/Header';
import { HeroScene } from '@/components/HeroScene';
import { ArchImage } from '@/components/ui/ArchImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShurfaDivider } from '@/components/ui/Shurfa';
import { Skeleton } from '@/components/ui/Skeleton';
import { Timeline } from '@/components/ui/Timeline';
import { Link } from '@/i18n/navigation';

const ROLES = ['Owner', 'Tenant', 'Manager', 'Broker'] as const;

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mb-10 flex max-w-2xl flex-col gap-3">
      <h2 className="display-font text-h1 md:text-d2/none">{title}</h2>
      {body && <p className="text-h3 text-text-muted">{body}</p>}
    </div>
  );
}

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('landing');
  const h = useTranslations('home');
  const c = useTranslations('common');
  const lang = locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(
      new Date(iso),
    );

  return (
    <main>
      {/* 1. Hero: one scene, one sentence */}
      <section data-theme="dark" className="relative isolate min-h-[100svh] overflow-hidden">
        {/* A real image (generated from HeroScene) so the hero is the LCP element. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-dusk.svg"
          alt=""
          width={1600}
          height={900}
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-bottom"
        />
        <Header showTheme={false} />
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-48 pt-20 md:pt-36">
          <h1 className="display-font max-w-3xl text-h1 md:text-d2">{h('headline')}</h1>
          <p className="rise-in max-w-xl text-h3 text-text/90" style={{ animationDelay: '120ms' }}>
            {h('subhead')}
          </p>
          <div className="rise-in flex flex-wrap gap-3" style={{ animationDelay: '240ms' }}>
            <Button asChild size="lg">
              <Link href="/auth">{h('start')}</Link>
            </Button>
            <Button asChild size="lg" variant="quiet">
              <a href="#how">{t('heroSecondary')}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Role fork */}
      <section data-theme="light" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title={t('rolesTitle')} body={t('rolesSubtitle')} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {ROLES.map((r) => (
              <li key={r}>
                <Link
                  href="/auth"
                  className="hairline group flex h-full flex-col gap-2 rounded-lg bg-surface p-6 transition-colors duration-200 hover:border-brand"
                >
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-h2 font-semibold">{t(`role${r}`)}</span>
                    <ArrowRight
                      size={20}
                      aria-hidden="true"
                      className="text-brand-text transition-transform duration-200 ease-rk rtl:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1"
                    />
                  </span>
                  <span className="text-text-muted">{t(`role${r}Body`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div data-theme="light" className="px-6">
        <ShurfaDivider className="mx-auto max-w-5xl" />
      </div>

      {/* 3. How it works */}
      <section id="how" data-theme="light" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title={t('howTitle')} />
          <ol className="grid gap-10 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex flex-col gap-3">
                <span
                  className="display-font tabular text-d2/none text-brand-text"
                  aria-hidden="true"
                >
                  {n}
                </span>
                <h3 className="text-h2 font-semibold">{t(`step${n}Title`)}</h3>
                <p className="text-text-muted">{t(`step${n}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Property Health Record story */}
      <section data-theme="dark" className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h2 className="display-font text-h1 md:text-d2/none">{t('recordTitle')}</h2>
            <p className="text-h3 text-text-muted">{t('recordBody')}</p>
            <p className="text-caption text-text-muted">{t('recordSample')}</p>
            <Timeline
              label={t('recordTimelineLabel')}
              events={[
                { id: 'e1', date: fmt('2026-01-05'), title: t('ev1Title'), detail: t('ev1Detail') },
                { id: 'e4', date: fmt('2026-01-05'), title: t('ev4Title'), detail: t('ev4Detail') },
                { id: 'e2', date: fmt('2026-06-18'), title: t('ev2Title'), detail: t('ev2Detail') },
                { id: 'e3', date: fmt('2026-11-02'), title: t('ev3Title'), detail: t('ev3Detail') },
              ]}
            />
          </div>
          <div className="mx-auto w-full max-w-sm">
            <ArchImage>
              <HeroScene crop="arch" className="absolute inset-0 h-full w-full" />
            </ArchImage>
          </div>
        </div>
      </section>

      {/* 5. Insights teaser */}
      <section data-theme="light" className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <SectionTitle title={t('insightsTitle')} body={t('insightsBody')} />
          <Card aria-label={t('insightsSoon')} className="flex flex-col gap-4 p-6">
            <div className="flex items-end gap-2" aria-hidden="true">
              {[40, 64, 52, 88, 72, 100].map((h, i) => (
                <Skeleton key={i} className="flex-1 !rounded-sm" style={{ height: `${h}px` }} />
              ))}
            </div>
            <Skeleton className="h-3 w-2/3" />
            <p className="text-small text-text-muted">{t('insightsSoon')}</p>
          </Card>
        </div>
      </section>

      {/* 6. Trust */}
      <section data-theme="dark" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title={t('trustTitle')} />
          <ul className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <Card className="flex h-full flex-col gap-2">
                  <h3 className="text-h3 font-semibold">{t(`trust${n}Title`)}</h3>
                  <p className="text-small text-text-muted">{t(`trust${n}Body`)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. Footer CTA */}
      <section data-theme="light" className="px-6 pt-24 pb-12">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-8">
          <h2 className="display-font text-h1 md:text-d2/none">{t('ctaTitle')}</h2>
          <Button asChild size="lg">
            <Link href="/auth">{h('start')}</Link>
          </Button>
          <ShurfaDivider className="mt-8" />
          <footer className="flex w-full flex-wrap items-center justify-between gap-4 text-small text-text-muted">
            <span className="flex items-center gap-2 text-brand-text">
              <BrandMark size={20} />
              <span className="display-font text-text">{c('appName')}</span>
            </span>
            <p className="max-w-md">{t('footerNote')}</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
