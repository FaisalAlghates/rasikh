'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { IconButton } from '@/components/ui/IconButton';
import { StatusDot, type Status } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { SAMPLE_PROPERTIES } from '@/lib/map/sample-data';
import { MapView } from './MapView';

type Filter = 'all' | Status;

export function PortfolioClient() {
  const t = useTranslations('portfolio');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  // ?preset=night|dusk|dawn|day pins the lighting (handy for design review)
  const q2 =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('preset');
  const forced = (['dawn', 'day', 'dusk', 'night'] as const).find((x) => x === q2);

  const fmt = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const statusLabel = (s: Status) =>
    t(s === 'ok' ? 'statusOk' : s === 'warn' ? 'statusWarn' : 'statusLate');

  const visible = SAMPLE_PROPERTIES.filter((p) => {
    const text = `${t(`name.${p.id}`)} ${t(`place.${p.id}`)}`.toLowerCase();
    return (filter === 'all' || p.status === filter) && text.includes(q.trim().toLowerCase());
  });
  const current = SAMPLE_PROPERTIES.find((p) => p.id === selected);

  return (
    <div className="relative grid h-[calc(100dvh-5rem)] min-h-[560px] md:grid-cols-[22rem_1fr]">
      {/* list, in sync with the map */}
      <section
        aria-label={t('listLabel')}
        className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4"
      >
        <p className="rounded-md bg-surface px-3 py-2 text-caption text-text-muted">
          <span className="font-semibold text-brand-text">{t('sampleBadge')}</span> ·{' '}
          {t('sampleNote')}
        </p>
        <ul className="flex flex-col gap-2">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-testid={`row-${p.id}`}
                aria-pressed={p.id === selected}
                onClick={() => setSelected(p.id)}
                className={cn(
                  'hairline flex w-full flex-col gap-1 rounded-lg bg-surface p-4 text-start transition-colors duration-200',
                  p.id === selected && 'border-brand',
                )}
              >
                <span className="text-body font-medium">{t(`name.${p.id}`)}</span>
                <span className="text-small text-text-muted">{t(`place.${p.id}`)}</span>
                <StatusDot status={p.status} label={statusLabel(p.status)} />
              </button>
            </li>
          ))}
        </ul>
        {visible.length === 0 && <p className="text-small text-text-muted">{t('noResults')}</p>}
      </section>

      {/* map */}
      <div className="relative min-h-[420px]">
        <MapView
          properties={visible}
          selectedId={selected}
          onSelect={setSelected}
          fixedPreset={forced}
          labelFor={(id) => t(`name.${id}`)}
          mapLabel={t('mapLabel')}
        />

        {/* the one glass layer: search + filters, floating over the map */}
        <GlassPanel className="absolute inset-x-4 top-4 flex flex-col gap-3 p-3 md:inset-x-6">
          <div className="flex items-center gap-2">
            <Search size={18} aria-hidden="true" className="ms-2 shrink-0 text-text-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search')}
              aria-label={t('search')}
              className="min-h-11 w-full bg-transparent text-body text-text placeholder:text-text-muted"
            />
            <IconButton
              label={t('filters')}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
            </IconButton>
          </div>
          {/* filters reveal progressively */}
          {filtersOpen && (
            <div role="group" aria-label={t('filters')} className="flex flex-wrap gap-2">
              {(['all', 'ok', 'warn', 'late'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'hairline min-h-9 rounded-full px-4 text-small transition-colors duration-200',
                    filter === f ? 'bg-brand text-on-brand' : 'text-text',
                  )}
                >
                  {f === 'all' ? t('all') : statusLabel(f)}
                </button>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* peek card (solid: only one glass layer per screen) */}
        {current && (
          <div
            data-testid="peek-card"
            className="rise-in hairline absolute inset-x-4 bottom-4 rounded-lg bg-surface p-5 md:inset-x-auto md:start-6 md:w-96"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h3 font-semibold">{t(`name.${current.id}`)}</h2>
                <p className="text-small text-text-muted">{t(`place.${current.id}`)}</p>
              </div>
              <IconButton label={t('close')} onClick={() => setSelected(undefined)}>
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-small">
              <div>
                <dt className="text-text-muted">{t('rent')}</dt>
                <dd className="tabular text-body font-medium">
                  {fmt.format(current.rentSar)} {t('sar')}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">&nbsp;</dt>
                <dd className="text-body font-medium">{t('units', { count: current.units })}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <StatusDot status={current.status} label={statusLabel(current.status)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
