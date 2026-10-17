'use client';

import { ArrowLeft, Crosshair, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusDot, type Status } from '@/components/ui/Card';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { CITIES, cityById } from '@/lib/map/kingdom';
import { SAMPLE_PROPERTIES, type MapProperty } from '@/lib/map/sample-data';
import { normalize } from '@/lib/nav';
import { PREF, readPref } from '@/lib/prefs';
import { MapView, type CityPin } from './MapView';
import type { MyPortfolioData } from './MyPortfolio';

// Firebase loads only for people who are signed in (anonymous visitors get a light page).
const MyPortfolio = dynamic(() => import('./MyPortfolio'), { ssr: false });
const GoogleEarthView = dynamic(() => import('./GoogleEarthView').then((m) => m.GoogleEarthView), {
  ssr: false,
});

type Filter = 'all' | Status;
type Source = 'mine' | 'samples';

export function MapClient() {
  const t = useTranslations('portfolio');
  const c = useTranslations('cities');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [signedIn, setSignedIn] = useState(false);
  const [mine, setMine] = useState<MyPortfolioData | null>(null);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [source, setSource] = useState<Source>('samples');
  const [preset, setPreset] = useState<'dawn' | 'day' | 'dusk' | 'night'>();
  const [placing, setPlacing] = useState(false);
  const [pinNote, setPinNote] = useState<{ ok: boolean; text: string }>();

  // ?city=jeddah, ?property=<id> and ?preset=dusk deep links
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const c = sp.get('city');
    if (c && cityById(c)) setCityId(c);
    const p = sp.get('property');
    if (p) setSelected(p);
    const pr = (['dawn', 'day', 'dusk', 'night'] as const).find((x) => x === sp.get('preset'));
    setPreset(pr);
    setSignedIn(readPref(PREF.signedIn) === '1');
  }, []);

  const onMine = useCallback((d: MyPortfolioData | null) => {
    setMine(d);
    if (d && d.items.length > 0) setSource('mine');
  }, []);

  const samples: MapProperty[] = useMemo(
    () =>
      SAMPLE_PROPERTIES.map((p) => ({
        ...p,
        name: t(`name.${p.id}`),
        place: t(`place.${p.id}`),
      })),
    [t],
  );
  const all = source === 'mine' && mine ? mine.items : samples;
  const cityName = useCallback((id: string) => c(id), [c]);
  const canPin = source === 'mine' && !!mine;

  /** Saves the exact pin of the selected property (owners and managers; the rules check the same). */
  const savePin = async ([lng, lat]: [number, number]) => {
    setPlacing(false);
    if (!mine || !selected) return;
    try {
      const [{ doc, updateDoc }, { firebaseDb }] = await Promise.all([
        import('firebase/firestore'),
        import('@/lib/firebase'),
      ]);
      await updateDoc(doc(firebaseDb(), `orgs/${mine.orgId}/properties/${selected}`), {
        location: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), source: 'map' },
      });
      setPinNote({ ok: true, text: t('pinSaved') });
    } catch {
      setPinNote({ ok: false, text: t('pinFailed') });
    }
  };

  // a deep-linked property opens its city
  useEffect(() => {
    const p = all.find((x) => x.id === selected);
    if (p && p.cityId !== cityId) setCityId(p.cityId);
    // only when the data or the selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, selected]);

  const matches = useMemo(() => {
    const words = normalize(q).split(' ').filter(Boolean);
    return all.filter((p) => {
      const text = normalize(`${p.name} ${p.place} ${cityName(p.cityId)}`);
      return (filter === 'all' || p.status === filter) && words.every((w) => text.includes(w));
    });
  }, [all, q, filter, cityName]);
  const visible = useMemo(
    () => (cityId ? matches.filter((p) => p.cityId === cityId) : matches),
    [matches, cityId],
  );
  const current = all.find((p) => p.id === selected);

  const pins: CityPin[] = useMemo(
    () =>
      CITIES.map((c) => ({
        id: c.id,
        label: cityName(c.id),
        count: matches.filter((p) => p.cityId === c.id).length,
      })),
    [cityName, matches],
  );
  // stable sort: ties keep the CITIES order (identical on server and client)
  const chips = [...pins].sort((a, b) => b.count - a.count);

  const statusLabel = (s: Status) =>
    t(s === 'ok' ? 'statusOk' : s === 'warn' ? 'statusWarn' : 'statusLate');
  const cityLabel = useCallback(
    (pin: CityPin) =>
      `${t('cityGo', { city: pin.label })}: ${t('cityCount', { count: pin.count })}`,
    [t],
  );
  const fmt = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const chooseCity = useCallback((id: string | undefined) => {
    setCityId(id);
    setSelected(undefined);
    setPlacing(false);
  }, []);
  // a new selection drops any half-finished placing and old notes
  useEffect(() => {
    setPlacing(false);
    setPinNote(undefined);
  }, [selected]);

  return (
    <div className="relative flex flex-col lg:grid lg:h-[calc(100dvh-4.5rem)] lg:min-h-[620px] lg:grid-cols-[24rem_1fr]">
      {signedIn && <MyPortfolio onData={onMine} />}

      {/* panel: title, source, cities, list (in sync with the map) */}
      <section
        aria-labelledby="map-title"
        className="order-2 flex min-h-0 flex-col gap-4 p-4 lg:order-1 lg:overflow-y-auto"
      >
        <header className="flex flex-col gap-1">
          <h1 id="map-title" className="display-font text-h2">
            {t('title')}
          </h1>
          <p className="text-small text-text-muted">{t('lead')}</p>
        </header>

        {mine && mine.items.length > 0 && (
          <div role="group" aria-label={t('source')} className="hairline flex rounded-full p-1">
            {(['mine', 'samples'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={source === s}
                onClick={() => {
                  setSource(s);
                  setSelected(undefined);
                }}
                className={cn(
                  'min-h-10 flex-1 rounded-full text-small transition-colors duration-200',
                  source === s ? 'bg-brand font-semibold text-on-brand' : 'text-text-muted',
                )}
              >
                {s === 'mine' ? t('mine') : t('samples')}
              </button>
            ))}
          </div>
        )}

        {source === 'samples' ? (
          <p className="rounded-md bg-surface px-3 py-2 text-caption text-text-muted">
            <span className="font-semibold text-brand-text">{t('sampleBadge')}</span> ·{' '}
            {t('sampleNote')}
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-caption text-text-muted">
            <MapPin size={14} aria-hidden="true" className="shrink-0 text-brand-text" />
            <span>
              {t('approx')}
              {mine && mine.unplaced > 0 && <> · {t('unplaced', { count: mine.unplaced })}</>}
            </span>
          </p>
        )}

        {/* city switcher: the whole Kingdom, then cities with properties first */}
        <div role="group" aria-labelledby="map-cities" className="flex flex-col gap-2">
          <h2 id="map-cities" className="text-small font-semibold">
            {t('citiesLabel')}
          </h2>
          <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
            <li className="shrink-0">
              <button
                type="button"
                aria-pressed={!cityId}
                onClick={() => chooseCity(undefined)}
                data-testid="city-kingdom"
                className={cn(
                  'hairline min-h-10 rounded-full px-4 text-small transition-colors duration-200',
                  !cityId ? 'bg-brand text-on-brand' : 'text-text hover:bg-surface',
                )}
              >
                {t('kingdom')}
              </button>
            </li>
            {chips.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={cityId === c.id}
                  onClick={() => chooseCity(c.id)}
                  data-testid={`city-${c.id}`}
                  className={cn(
                    'hairline inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-small transition-colors duration-200',
                    cityId === c.id ? 'bg-brand text-on-brand' : 'text-text hover:bg-surface',
                  )}
                >
                  {c.label}
                  {c.count > 0 && <span className="tabular opacity-80">{c.count}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-caption text-text-muted">{t('regionsNote')}</p>
        </div>

        <ul aria-label={t('listLabel')} className="flex flex-col gap-2">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-testid={`row-${p.id}`}
                aria-pressed={p.id === selected}
                onClick={() => {
                  setCityId(p.cityId);
                  setSelected(p.id);
                }}
                className={cn(
                  'hairline flex w-full flex-col gap-1 rounded-lg bg-surface p-4 text-start transition-colors duration-200 hover:border-brand',
                  p.id === selected && 'border-brand',
                )}
              >
                <span className="text-body font-medium">{p.name}</span>
                <span className="text-small text-text-muted">{p.place}</span>
                <StatusDot status={p.status} label={statusLabel(p.status)} />
              </button>
            </li>
          ))}
        </ul>
        {visible.length === 0 && <p className="text-small text-text-muted">{t('noResults')}</p>}
        <p className="text-caption text-text-muted">{t('indicatorsNote')}</p>
      </section>

      {/* map */}
      <div className="relative order-1 h-[62svh] min-h-[420px] lg:order-2 lg:h-auto">
        <MapView
          properties={visible}
          selectedId={selected}
          onSelect={setSelected}
          cities={pins}
          cityId={cityId}
          onCity={chooseCity}
          fixedPreset={preset}
          mapLabel={t('mapLabel')}
          cityLabel={cityLabel}
          flatNote={t('flatNote')}
          placing={placing}
          onPick={(ll) => void savePin(ll)}
          placingLabel={current ? t('placingHint', { name: current.name }) : undefined}
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
            {cityId && (
              <button
                type="button"
                onClick={() => chooseCity(undefined)}
                className="hairline inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-small text-text"
              >
                <ArrowLeft size={16} aria-hidden="true" className="ltr:rotate-180" />
                <span className="hidden sm:inline">{t('kingdom')}</span>
                <span className="sr-only sm:hidden">{t('kingdom')}</span>
              </button>
            )}
            <IconButton
              label={t('filters')}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
            </IconButton>
          </div>
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

        {current && process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
          <GoogleEarthView
            name={current.name}
            coords={current.coords}
            open={googleOpen}
            onOpenChange={setGoogleOpen}
          />
        )}
        {/* peek card (solid: only one glass layer per screen) */}
        {current && (
          <div
            data-testid="peek-card"
            className="rise-in hairline absolute inset-x-4 bottom-4 rounded-lg bg-surface p-5 md:inset-x-auto md:start-6 md:w-96"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h3 font-semibold">{current.name}</h2>
                <p className="text-small text-text-muted">{current.place}</p>
              </div>
              <IconButton label={t('close')} onClick={() => setSelected(undefined)}>
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
            {/* while placing, the card shrinks to its title and the hint so the map stays free to click */}
            {!placing && (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-small">
                  <div>
                    <dt className="text-text-muted">{t('rent')}</dt>
                    <dd className="tabular text-body font-medium">
                      {fmt.format(current.rentSar)} {t('sar')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">{cityName(current.cityId)}</dt>
                    <dd className="text-body font-medium">
                      {t('units', { count: current.units })}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <StatusDot status={current.status} label={statusLabel(current.status)} />
                  {source === 'mine' && (
                    <Link
                      href="/workspace?s=properties"
                      className="inline-flex min-h-10 items-center gap-1.5 text-small font-semibold text-brand-text underline-offset-4 hover:underline"
                    >
                      {t('openWorkspace')}
                      <ArrowLeft size={14} aria-hidden="true" className="ltr:rotate-180" />
                    </Link>
                  )}
                </div>
                {source === 'mine' && (
                  <p className="mt-2 flex items-center gap-1 text-caption text-text-muted">
                    <MapPin size={12} aria-hidden="true" />
                    {current.approximate ? t('approx') : t('exact')}
                  </p>
                )}
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                  <button
                    type="button"
                    onClick={() => setGoogleOpen(true)}
                    className="hairline mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-small font-semibold text-brand-text hover:bg-night/5"
                    data-testid="google-view"
                  >
                    {t('googleView')}
                  </button>
                )}
                <p className="mt-1 text-caption text-text-muted" data-testid="model-note">
                  {current.plan ? t('modelReal') : t('modelApprox')}
                </p>
              </>
            )}
            {placing && (
              <div
                role="status"
                data-testid="placing-hint"
                className="mt-3 flex items-center justify-between gap-3 rounded-md bg-bg p-3 text-small"
              >
                <span className="flex items-center gap-2">
                  <Crosshair size={16} aria-hidden="true" className="shrink-0 text-brand-text" />
                  {t('placingHint', { name: current.name })}
                </span>
                <button
                  type="button"
                  onClick={() => setPlacing(false)}
                  className="hairline inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-text hover:bg-surface"
                >
                  {t('placingCancel')}
                </button>
              </div>
            )}
            {canPin && !placing && (
              <button
                type="button"
                data-testid="set-pin"
                onClick={() => {
                  setPinNote(undefined);
                  setPlacing(true);
                }}
                className="hairline mt-3 inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-small text-text hover:bg-bg"
              >
                <Crosshair size={16} aria-hidden="true" className="text-brand-text" />
                {current.approximate ? t('setPin') : t('movePin')}
              </button>
            )}
            {pinNote && (
              <p
                role={pinNote.ok ? 'status' : 'alert'}
                className={cn('mt-2 text-small', pinNote.ok ? 'text-success' : 'text-danger')}
              >
                {pinNote.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
