import {
  DESIGN_STYLES,
  builtUpArea,
  confirmProgram,
  searchOptions,
  type Plot,
  type Zoning,
} from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { HoverModel } from '@/components/eng/HoverModel';
import { Elevation } from '@/components/eng/sheets/Elevation';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';

export const metadata = { robots: { index: false, follow: false } };

const PLOT: Plot = {
  width: 22,
  depth: 32,
  streets: { front: 15, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
  landUse: 'residential',
};
const ZONING: Zoning = {
  use: 'residential',
  setbacks: { front: 4, back: 2, left: 2, right: 2 },
  coverageMax: 0.6,
  farMax: 1.8,
  maxFloors: 3,
  maxHeightM: 12,
  parkingPerUnit: 1,
};

/** The same brief on the same plot in each of the four design languages (a lab page, not indexed). */
export default function StylesLab({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('eng');
  const lang = locale === 'ar' ? 'ar' : 'en';
  const sets = DESIGN_STYLES.map((style) => {
    const program = confirmProgram({ type: 'villa', floors: 2, bedrooms: 4, style }).data!;
    const plan = searchOptions(PLOT, ZONING, program, { count: 6 }).options[0]!;
    return { style, plan };
  });
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-6 pb-24 outline-none">
        <h1 className="display-font text-h1">{t('styleLabel')}</h1>
        <p className="mt-2 max-w-xl text-text-muted">{t('view3dHint')}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2" data-testid="style-gallery">
          {sets.map(({ style, plan }) => (
            <section
              key={style}
              aria-labelledby={`st-${style}`}
              data-style={style}
              className="hairline flex flex-col gap-2 rounded-xl bg-[#fffdf9] p-4 text-night"
            >
              <h2 id={`st-${style}`} className="text-h3 font-semibold">
                {t(`style.${style}`)}
              </h2>
              <HoverModel plan={plan}>
                <Elevation
                  plan={plan}
                  side="front"
                  style={style}
                  title={t(`style.${style}`)}
                  lang={lang}
                />
              </HoverModel>
              <p className="text-caption text-[#5f594f]">
                {plan.footprint.w.toFixed(1)} × {plan.footprint.h.toFixed(1)} m ·{' '}
                {Math.round(builtUpArea(plan))} m²
              </p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
