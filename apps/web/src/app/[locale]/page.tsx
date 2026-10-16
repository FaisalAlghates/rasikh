import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use, type CSSProperties } from 'react';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { HeroScene } from '@/components/HeroScene';
import { CursorGlow } from '@/components/immersive/CursorGlow';
import { Magnetic } from '@/components/immersive/Magnetic';
import { SplitWords } from '@/components/immersive/SplitWords';
import { Tilt } from '@/components/immersive/Tilt';
import { SectionCard } from '@/components/SectionCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Link } from '@/i18n/navigation';
import { ROUTES } from '@/lib/nav';

const SECTIONS = ['property', 'office', 'broker'] as const;

function Frieze() {
  return (
    <div data-theme="dark" className="clear px-6 py-6 text-brand-text" aria-hidden="true">
      <div className="frieze mx-auto max-w-6xl" />
    </div>
  );
}

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mb-12 flex max-w-2xl flex-col gap-4">
      <h2 className="display-font text-h1 md:text-d2/none">
        <SplitWords text={title} onView />
      </h2>
      {body && (
        <p data-reveal className="text-h3 text-text/75" style={{ '--d': 2 } as CSSProperties}>
          {body}
        </p>
      )}
    </div>
  );
}

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('landing');
  const h = useTranslations('home');
  const nav = useTranslations('nav');
  const lang = locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(
      new Date(iso),
    );

  const events = [
    { id: 'e1', date: fmt('2026-01-05'), title: t('ev1Title'), detail: t('ev1Detail') },
    { id: 'e4', date: fmt('2026-01-05'), title: t('ev4Title'), detail: t('ev4Detail') },
    { id: 'e2', date: fmt('2026-06-18'), title: t('ev2Title'), detail: t('ev2Detail') },
    { id: 'e3', date: fmt('2026-11-02'), title: t('ev3Title'), detail: t('ev3Detail') },
  ];

  return (
    <>
      <main id="main" tabIndex={-1} className="relative overflow-x-clip outline-none">
        <CursorGlow />

        {/* 1. Hero: the 3D city is the backdrop; the poster is the first paint and the fallback. */}
        <section
          data-theme="dark"
          data-scene-stop
          className="clear relative isolate min-h-[100svh] overflow-hidden"
        >
          {/* A real image (generated from HeroScene) shown until the 3D scene is ready. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-dusk.svg"
            alt=""
            width={1600}
            height={900}
            fetchPriority="high"
            className="hero-poster absolute inset-0 -z-10 h-full w-full object-cover object-bottom"
          />
          <SiteHeader variant="overlay" />
          <div className="hero-copy mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-44 pt-14 md:pt-28">
            <h1 className="display-font max-w-4xl text-h1 md:max-w-[52%] md:text-d1">
              <SplitWords text={h('headline')} />
            </h1>
            <p
              className="rise-in max-w-xl text-h3 text-text md:max-w-[42%]"
              style={{ animationDelay: '900ms' }}
            >
              {h('subhead')}
            </p>
            <div
              className="rise-in flex flex-wrap items-center gap-4"
              style={{ animationDelay: '1100ms' }}
            >
              <Magnetic>
                <Button asChild size="lg" className="pulse-ring">
                  <Link href="/auth">{h('start')}</Link>
                </Button>
              </Magnetic>
              <Magnetic>
                <Button asChild size="lg" variant="quiet">
                  <a href="#how">{t('heroSecondary')}</a>
                </Button>
              </Magnetic>
            </div>
          </div>
          <div className="rise-in absolute inset-x-0 bottom-0" style={{ animationDelay: '1500ms' }}>
            <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-6 pb-8">
              <p className="flex items-center gap-3 text-small text-text/85">
                <span className="win-glyph" aria-hidden="true" />
                {t('heroCaption')}
              </p>
              <span
                className="scroll-cue flex flex-col items-center gap-1 text-brand-text"
                aria-hidden="true"
              >
                <i />
              </span>
              <span className="sr-only">{t('scrollHint')}</span>
            </div>
          </div>
        </section>

        {/* 2. Role fork: four cards that tilt toward the pointer */}
        <section data-theme="dark" data-scene-stop className="clear px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <SectionTitle title={t('sectionsTitle')} body={t('sectionsSubtitle')} />
            <ul className="grid gap-5 md:grid-cols-3">
              {SECTIONS.map((s, i) => (
                <li key={s} data-reveal style={{ '--d': i } as CSSProperties}>
                  <Tilt className="panel h-full">
                    <SectionCard
                      section={s}
                      title={t(`sections.${s}.title`)}
                      body={t(`sections.${s}.body`)}
                      badge={t('sectionsFree')}
                    />
                  </Tilt>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Frieze />

        {/* 3. How it works: pinned; scrolling advances the step */}
        <section
          id="how"
          data-theme="dark"
          data-scene-stop
          data-pin
          data-steps="3"
          className="how how-pin clear relative"
        >
          <div className="how-sticky">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 md:grid-cols-[0.85fr_1.15fr]">
              <div className="flex flex-col gap-4">
                <h2 className="text-h2 font-semibold text-text">{t('howTitle')}</h2>
                <div
                  className="how-num display-font text-[clamp(8rem,24vw,18rem)] leading-none text-brand-text"
                  aria-hidden="true"
                >
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="relative w-px shrink-0 bg-border/30" aria-hidden="true">
                  <div className="how-bar absolute inset-0 bg-brand" />
                </div>
                <ol className="flex flex-col gap-4">
                  {[1, 2, 3].map((n, i) => (
                    <li key={n} data-i={i} className="how-item panel p-6">
                      <h3 className="text-h2 font-semibold">{t(`step${n}Title`)}</h3>
                      <p className="mt-2 text-text/75">{t(`step${n}Body`)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Property Health Record: the line draws itself; the doorway has depth */}
        <section data-theme="dark" data-scene-stop className="clear px-6 py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
            <div className="panel flex flex-col gap-6 p-8">
              <h2 className="display-font text-h1 md:text-d2/none">
                <SplitWords text={t('recordTitle')} onView />
              </h2>
              <p data-reveal className="text-h3 text-text/75">
                {t('recordBody')}
              </p>
              <p className="text-caption text-text/75">{t('recordSample')}</p>
              <ol
                data-progress
                aria-label={t('recordTimelineLabel')}
                className="relative mt-2 flex flex-col gap-9"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 start-[7px] w-px bg-border/30"
                />
                <span
                  aria-hidden="true"
                  className="tl-line absolute inset-y-2 start-[7px] w-px bg-brand"
                />
                {events.map((e) => (
                  <li key={e.id} data-reveal className="relative ps-10">
                    <span
                      aria-hidden="true"
                      className="tl-node absolute start-0 top-1.5 size-[15px] rounded-full bg-brand ring-4 ring-bg"
                    />
                    <p className="tabular text-caption text-text/75">{e.date}</p>
                    <p className="text-body font-medium text-text">{e.title}</p>
                    <p className="mt-0.5 text-small text-text/75">{e.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
            <Tilt max={6} className="mx-auto w-full max-w-sm">
              <div className="arch-stack" data-progress>
                <div className="arch-layer l1" aria-hidden="true" />
                <div className="arch-layer l2" aria-hidden="true" />
                <div className="arch-layer l3">
                  <HeroScene crop="arch" className="block" />
                </div>
              </div>
            </Tilt>
          </div>
        </section>

        {/* 5. Insights: a sand interlude (the 3D city rests) */}
        <section data-theme="light" className="px-6 py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div className="flex flex-col items-start">
              <SectionTitle title={t('insightsTitle')} body={t('insightsBody')} />
              <Button asChild size="lg" variant="quiet">
                <Link href={ROUTES.map}>{nav('map')}</Link>
              </Button>
            </div>
            <Tilt max={5} className="panel bg-surface!">
              <div data-reveal className="flex flex-col gap-5 p-7">
                <div className="flex h-28 items-end gap-2.5" aria-hidden="true">
                  {[40, 64, 52, 92, 72, 108].map((v, i) => (
                    <div
                      key={i}
                      className="bar flex-1 rounded-sm bg-brand"
                      style={
                        { height: `${v}px`, '--i': i, opacity: 0.35 + i * 0.1 } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <Skeleton className="h-3 w-2/3" />
                <p className="text-small text-text/75">{t('insightsSoon')}</p>
              </div>
            </Tilt>
          </div>
        </section>

        {/* 6. Trust */}
        <section data-theme="dark" className="clear px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <SectionTitle title={t('trustTitle')} />
            <ul className="grid gap-5 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <li key={n} data-reveal style={{ '--d': n } as CSSProperties}>
                  <Tilt className="panel h-full">
                    <div className="flex h-full flex-col gap-3 p-7">
                      <h3 className="depth-1 text-h3 font-semibold">{t(`trust${n}Title`)}</h3>
                      <p className="text-small text-text/75">{t(`trust${n}Body`)}</p>
                    </div>
                  </Tilt>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Frieze />

        {/* 7. Finale: night falls, the windows are lit */}
        <section data-theme="dark" data-scene-stop className="clear px-6 pb-12 pt-32">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-10">
            <h2 className="display-font max-w-4xl text-h1 md:text-d1">
              <SplitWords text={t('ctaTitle')} onView />
            </h2>
            <Magnetic>
              <Button asChild size="lg" className="pulse-ring">
                <Link href="/auth">{h('start')}</Link>
              </Button>
            </Magnetic>
            <p className="max-w-md text-small text-text/75">{t('footerNote')}</p>
          </div>
        </section>
      </main>
      <div data-theme="dark">
        <SiteFooter />
      </div>
    </>
  );
}
