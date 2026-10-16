import { Check, X } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { PRODUCT_SECTIONS, type ProductSection } from '@rasikh/shared';
import { StartSection } from '@/components/StartSection';
import { ContentPage } from '@/components/shell/ContentPage';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/content';
import { ROUTES } from '@/lib/nav';
import { LOCALES } from '@/lib/site';

const KEY = {
  property: 'sectionProperty',
  office: 'sectionOffice',
  broker: 'sectionBroker',
} as const satisfies Record<ProductSection, keyof typeof ROUTES>;

const isSection = (s: string): s is ProductSection =>
  (PRODUCT_SECTIONS as readonly string[]).includes(s);

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.flatMap((locale) => PRODUCT_SECTIONS.map((section) => ({ locale, section })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  return isSection(section) ? pageMetadata(locale, KEY[section]) : {};
}

type Step = { h: string; p: string };

/** Short separate videos, one per feature, shown on the page of the section they belong to. */
const MORE: Record<ProductSection, readonly string[]> = {
  property: ['leases', 'inspections', 'maintenance', 'buildings', 'assistant', 'map'],
  office: ['styles'],
  broker: [],
};

/** One product section explained on its own page: a walkthrough video, the steps, and what it never does. */
export default function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = use(params);
  setRequestLocale(locale);
  if (!isSection(section)) notFound();
  const t = useTranslations('pages.sections');
  const nav = useTranslations('nav');
  const steps = t.raw(`${section}.steps`) as Step[];
  const includes = t.raw(`${section}.includes`) as string[];
  const never = t.raw(`${section}.never`) as string[];
  const others = PRODUCT_SECTIONS.filter((s) => s !== section);

  return (
    <ContentPage title={nav(KEY[section])} lead={t(`${section}.lead`)} wide>
      <div className="mb-10 flex flex-wrap items-center gap-4">
        <StartSection section={section} label={t('page.start')} />
        <span className="rounded-full border border-brand px-3 py-1 text-small text-brand-text">
          {t('page.free')}
        </span>
        <p className="max-w-xl text-small text-text-muted">{t('page.separate')}</p>
      </div>

      <section aria-labelledby="sec-video" className="flex flex-col gap-4">
        <h2 id="sec-video" className="text-h2 font-semibold">
          {t('page.videoTitle')}
        </h2>
        <video
          controls
          preload="metadata"
          playsInline
          aria-label={t('page.videoLabel')}
          className="hairline aspect-video w-full max-w-4xl rounded-xl bg-night"
          data-testid="section-video"
        >
          <source src={`/videos/${section}.webm`} type="video/webm" />
        </video>
      </section>

      {section === 'office' && (
        <section aria-labelledby="sec-drawings" className="mt-12 flex flex-col gap-4">
          <h2 id="sec-drawings" className="text-h2 font-semibold">
            {t('office.drawingsVideoTitle')}
          </h2>
          <video
            controls
            preload="metadata"
            playsInline
            aria-label={t('page.videoLabel')}
            className="hairline aspect-video w-full max-w-4xl rounded-xl bg-night"
            data-testid="drawings-video"
          >
            <source src="/videos/drawings.webm" type="video/webm" />
          </video>
          <h3 className="mt-2 text-h3 font-semibold">{t('page.printTitle')}</h3>
          <ol className="flex max-w-3xl flex-col gap-2 ps-5 text-body" data-testid="print-steps">
            {(t.raw('office.print') as string[]).map((x) => (
              <li key={x} className="list-decimal">
                {x}
              </li>
            ))}
          </ol>
        </section>
      )}

      {MORE[section].length > 0 && (
        <section aria-labelledby="sec-more" className="mt-12 flex flex-col gap-4">
          <h2 id="sec-more" className="text-h2 font-semibold">
            {t('page.moreTitle')}
          </h2>
          <ul className="grid gap-6 md:grid-cols-2" data-testid="more-videos">
            {MORE[section].map((v) => (
              <li key={v} className="flex flex-col gap-2">
                <h3 className="text-h3 font-semibold">{t(`more.${v}`)}</h3>
                <video
                  controls
                  preload="none"
                  playsInline
                  aria-label={t(`more.${v}`)}
                  className="hairline aspect-video w-full rounded-xl bg-night"
                  data-video={v}
                >
                  <source src={`/videos/${v}.webm`} type="video/webm" />
                </video>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="sec-steps" className="mt-12 flex flex-col gap-4">
        <h2 id="sec-steps" className="text-h2 font-semibold">
          {t('page.stepsTitle')}
        </h2>
        <ol className="grid gap-3 md:grid-cols-3" data-testid="section-steps">
          {steps.map((s, i) => (
            <li key={s.h} className="hairline flex flex-col gap-1 rounded-xl bg-surface p-4">
              <span className="display-font text-h2 text-brand-text" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="text-body font-semibold">{s.h}</h3>
              <p className="text-small text-text-muted">{s.p}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section aria-labelledby="sec-includes" className="flex flex-col gap-3">
          <h2 id="sec-includes" className="text-h3 font-semibold">
            {t('page.includesTitle')}
          </h2>
          <ul className="flex flex-col gap-2">
            {includes.map((x) => (
              <li key={x} className="flex items-start gap-2 text-body">
                <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-success" />
                {x}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="sec-never" className="flex flex-col gap-3">
          <h2 id="sec-never" className="text-h3 font-semibold">
            {t('page.neverTitle')}
          </h2>
          <ul className="flex flex-col gap-2">
            {never.map((x) => (
              <li key={x} className="flex items-start gap-2 text-body">
                <X size={18} aria-hidden="true" className="mt-1 shrink-0 text-danger" />
                {x}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <nav aria-labelledby="sec-others" className="mt-12 flex flex-col gap-3">
        <h2 id="sec-others" className="text-h3 font-semibold">
          {t('page.others')}
        </h2>
        <ul className="flex flex-wrap gap-3">
          {others.map((s) => (
            <li key={s}>
              <Link
                href={ROUTES[KEY[s]]}
                className="hairline inline-flex min-h-11 items-center rounded-lg px-4 text-body hover:border-brand"
              >
                {nav(KEY[s])}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </ContentPage>
  );
}
