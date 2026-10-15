'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PortfolioTwinScene as TwinScene } from '@/lib/scene/PortfolioTwin';
import type { CellStatus, TwinCell, TwinPlan } from '@/lib/scene/twinPlan';
import { money } from '@/lib/ops/types';
import { cn } from '@/components/ui/cn';

const DOT: Record<CellStatus, string> = {
  ok: 'bg-[#F2C98A]',
  soon: 'bg-[#E8A23A]',
  late: 'bg-[#FF5A3C]',
  vacant: 'bg-[#4a433b]',
};
const ORDER: CellStatus[] = ['ok', 'soon', 'late', 'vacant'];

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * The portfolio as a living 3D twin (dusk, Najdi mud-brick, one window per unit lit in its payment status).
 * Falls back to a flat block view without WebGL or in automated browsers (set window.__RK_FORCE_MAP to force 3D).
 */
export function PortfolioTwin({ plan }: { plan: TwinPlan }) {
  const t = useTranslations('ops');
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TwinScene | null>(null);
  const [mode, setMode] = useState<'loading' | '3d' | 'flat'>('loading');
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const cells = useMemo(() => {
    const m = new Map<string, TwinCell & { building: string }>();
    for (const b of plan.buildings)
      for (const c of b.cells) m.set(c.unitId, { ...c, building: b.name });
    return m;
  }, [plan]);
  const empty = plan.buildings.length === 0;

  // create the scene once
  useEffect(() => {
    const forced = (window as { __RK_FORCE_MAP?: boolean }).__RK_FORCE_MAP === true;
    if (!webglOk() || (navigator.webdriver && !forced)) {
      setMode('flat');
      return;
    }
    let disposed = false;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower =
      (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia('(max-width: 640px)').matches;
    void import('@/lib/scene/PortfolioTwin').then(({ PortfolioTwinScene }) => {
      if (disposed || !canvas.current || !labels.current || !box.current) return;
      const s = new PortfolioTwinScene(
        canvas.current,
        labels.current,
        { onHover: setHovered, onSelect: setSelected },
        { reducedMotion: reduced, lowPower },
      );
      sceneRef.current = s;
      ro = new ResizeObserver(([e]) => e && s.resize(e.contentRect.width, e.contentRect.height));
      ro.observe(box.current);
      // pause rendering while the twin is scrolled out of view
      io = new IntersectionObserver(([e]) => (e?.isIntersecting ? s.start() : s.stop()));
      io.observe(box.current);
      setMode('3d');
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      io?.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // feed data and selection
  useEffect(() => {
    if (mode === '3d') sceneRef.current?.setPlan(plan);
  }, [plan, mode]);
  useEffect(() => {
    if (mode === '3d') sceneRef.current?.setSelected(selected);
  }, [selected, mode]);

  const focus = cells.get(selected ?? hovered ?? '');
  const statusLabel = (s: CellStatus) =>
    ({ ok: t('twinOk'), soon: t('twinSoon'), late: t('twinLate'), vacant: t('twinVacant') })[s];

  return (
    <section
      data-theme="dark"
      data-testid="portfolio-twin"
      aria-label={t('twinTitle')}
      className="relative overflow-hidden rounded-[28px] bg-[#0E0D0B]"
    >
      <div ref={box} className="relative h-[460px] w-full sm:h-[470px] lg:h-[520px]">
        <canvas
          ref={canvas}
          aria-hidden="true"
          className={cn('absolute inset-0 h-full w-full', mode !== '3d' && 'hidden')}
        />
        <div ref={labels} aria-hidden="true" className="pointer-events-none absolute inset-0" />
        {mode === 'flat' && <FlatTwin plan={plan} onSelect={setSelected} selected={selected} />}
        {mode === 'loading' && <div className="absolute inset-0 animate-pulse bg-[#15120f]" />}

        {/* header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-[#0E0D0B]/90 to-transparent p-5 sm:p-7">
          <div className="max-w-md">
            <h2 className="display-font text-h3 text-[#F4EEE4] sm:text-h1">{t('twinTitle')}</h2>
            <p className="mt-1 text-caption text-[#cfc6b8] sm:text-small">
              {empty ? t('twinEmpty') : t('twinSub')}
            </p>
          </div>
        </div>

        {/* selected / hovered unit */}
        {focus && (
          <div
            data-testid="twin-unit"
            className="absolute end-4 top-24 w-[min(17rem,calc(100%-2rem))] rounded-2xl border border-[#F4EEE4]/15 bg-[#1A1815] p-4 text-[#F4EEE4] shadow-2xl sm:end-7"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption text-[#bdb4a6]">{focus.building}</span>
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md px-2 text-small text-[#bdb4a6] hover:text-[#F4EEE4]"
                  aria-label={t('twinClose')}
                >
                  ×
                </button>
              )}
            </div>
            <p className="display-font text-h3">{focus.label}</p>
            <p className="mt-1 flex items-center gap-2 text-small">
              <span className={cn('inline-block size-2.5 rounded-full', DOT[focus.status])} />
              {statusLabel(focus.status)}
            </p>
            {focus.tenantName && (
              <p className="mt-2 text-small text-[#cfc6b8]">
                {t('twinTenant')}: {focus.tenantName}
              </p>
            )}
            {focus.nextDue && (
              <p className="text-small text-[#cfc6b8]">
                {t('twinNextDue')}:{' '}
                <span dir="ltr" className="tabular">
                  {focus.nextDue.date}
                </span>{' '}
                · {money(focus.nextDue.amount)} {t('sar')}
              </p>
            )}
          </div>
        )}

        {/* legend + hint */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-[#0E0D0B]/95 to-transparent p-5 sm:p-7">
          <ul className="flex flex-wrap gap-2" data-testid="twin-legend">
            {ORDER.map((s) => (
              <li
                key={s}
                className="flex items-center gap-2 rounded-full border border-[#F4EEE4]/12 bg-[#1A1815]/90 px-3 py-1 text-caption text-[#F4EEE4]"
              >
                <span className={cn('inline-block size-2.5 rounded-full', DOT[s])} />
                {statusLabel(s)}
                <span className="tabular text-[#bdb4a6]">{plan.counts[s]}</span>
              </li>
            ))}
          </ul>
          {mode === '3d' && !empty && (
            <p className="text-caption text-[#a89f92]">{t('twinHint')}</p>
          )}
        </div>
      </div>

      {/* the same information for screen readers */}
      <ul className="sr-only">
        {plan.buildings.map((b) => (
          <li key={b.id}>
            {b.name}:{' '}
            {b.cells.map((c) => `${c.label} ${statusLabel(c.status)}`).join('، ') ||
              t('twinNoUnits')}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Same plan as flat block towers (no WebGL needed). */
function FlatTwin({
  plan,
  selected,
  onSelect,
}: {
  plan: TwinPlan;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-6 overflow-x-auto px-6 pb-24 pt-28">
      {plan.buildings.map((b) => (
        <div key={b.id} className="flex flex-col items-center gap-2">
          <div
            className="grid gap-1 rounded-t-md bg-[#2a2420] p-1.5"
            style={{ gridTemplateColumns: `repeat(${b.cols}, 1.75rem)` }}
          >
            {Array.from({ length: b.floors * b.cols }, (_, i) => {
              const floor = b.floors - 1 - Math.floor(i / b.cols);
              const cell = b.cells.find((c) => c.floor === floor && c.col === i % b.cols);
              return (
                <button
                  key={i}
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => cell && onSelect(cell.unitId)}
                  className={cn(
                    'h-6 rounded-[3px] bg-[#a8754f]',
                    cell && selected === cell.unitId && 'outline outline-2 outline-[#F4EEE4]',
                  )}
                >
                  <span
                    className={cn(
                      'mx-auto block h-2.5 w-2.5 rounded-[2px]',
                      DOT[cell?.status ?? 'vacant'],
                    )}
                  />
                </button>
              );
            })}
          </div>
          <span className="whitespace-nowrap text-caption text-[#F4EEE4]">{b.name}</span>
        </div>
      ))}
    </div>
  );
}
