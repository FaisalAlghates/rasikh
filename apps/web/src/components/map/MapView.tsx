'use client';

import type { GeoJSONSource, Map as MapboxMap, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';
import {
  CITIES,
  KSA_BOUNDS,
  KSA_CENTER,
  KSA_OUTLINE,
  cityById,
  kingdomIndicators,
  project,
} from '@/lib/map/kingdom';
import { lightPresetFor, type LightPreset } from '@/lib/map/riyadh';
import type { MapProperty } from '@/lib/map/sample-data';

export interface CityPin {
  id: string;
  label: string;
  count: number;
}

export interface MapViewProps {
  properties: MapProperty[];
  selectedId?: string;
  onSelect: (id: string) => void;
  cities: CityPin[];
  /** Selected city, or undefined for the whole Kingdom. */
  cityId?: string;
  onCity: (id: string | undefined) => void;
  /** Pin the lighting; otherwise it follows Riyadh's local time. */
  fixedPreset?: LightPreset;
  mapLabel: string;
  /** Accessible name for a city pin, e.g. "Go to Jeddah: 3 properties". */
  cityLabel: (pin: CityPin) => string;
  flatNote: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
type Feat = { properties?: Record<string, unknown> | null; geometry?: { coordinates?: unknown } };
const CLAY = '#B5532C';
const CLAY_LIGHT = '#D9825A';
const STATUS_COLOR = { ok: '#D9825A', warn: '#E8A23A', late: '#FF5A3C' } as const;
/** Property pins appear once the camera is inside a city; city pins show above that. */
const CITY_ZOOM = 7.5;

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const overviewZoom = (w: number) => (w < 640 ? 3.6 : w < 1100 ? 4.2 : 4.6);

function features(properties: MapProperty[]) {
  return {
    type: 'FeatureCollection' as const,
    features: properties.map((p) => ({
      type: 'Feature' as const,
      properties: { id: p.id, status: p.status },
      geometry: { type: 'Point' as const, coordinates: p.coords },
    })),
  };
}

/**
 * The whole Kingdom in 3D (Mapbox Standard on a globe, lighting on Riyadh's clock). It arrives from
 * space onto the Kingdom, shows a pin per city, and flies into a city at ~60° when one is chosen.
 * Without a token or WebGL it renders a flat schematic of the Kingdom with the same interactions.
 */
export function MapView(props: MapViewProps) {
  const { properties, selectedId, cities, cityId, fixedPreset, mapLabel, cityLabel } = props;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const [mode, setMode] = useState<'loading' | 'map' | 'flat'>('loading');
  const [zoomedIn, setZoomedIn] = useState(false);
  const cb = useRef({ onSelect: props.onSelect, onCity: props.onCity });
  cb.current = { onSelect: props.onSelect, onCity: props.onCity };
  const pinsRef = useRef(cities);
  pinsRef.current = cities;

  /** Keeps city labels from overlapping: the busier city keeps its label, a close neighbour shows its dot. */
  const declutter = () => {
    const map = mapRef.current;
    if (!map) return;
    const placed: Array<{ x: number; y: number }> = [];
    const order = [...pinsRef.current].filter((p) => p.count > 0).sort((a, b) => b.count - a.count);
    for (const pin of order) {
      const m = markers.current.get(pin.id);
      const c = cityById(pin.id);
      if (!m || !c) continue;
      const pt = map.project(c.coords);
      const clash = placed.some((q) => Math.abs(q.x - pt.x) < 84 && Math.abs(q.y - pt.y) < 28);
      m.el.dataset.label = clash ? 'off' : 'on';
      if (!clash) placed.push(pt);
    }
  };
  const declutterRef = useRef(declutter);
  declutterRef.current = declutter;

  useEffect(() => {
    // Automated browsers use the flat schematic (deterministic, no network); set window.__RK_FORCE_MAP to test the real map.
    const forced = (window as { __RK_FORCE_MAP?: boolean }).__RK_FORCE_MAP === true;
    if (!TOKEN || !webglOk() || (navigator.webdriver && !forced)) {
      setMode('flat');
      return;
    }
    let disposed = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const markerStore = markers.current;

    void import('mapbox-gl').then(async (mod) => {
      if (disposed || !el.current) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = TOKEN;
      const w = el.current.clientWidth;
      let map: MapboxMap;
      try {
        map = new mapboxgl.Map({
          container: el.current,
          style: 'mapbox://styles/mapbox/standard',
          projection: 'globe',
          // arrive from space unless motion is reduced
          center: reduce ? KSA_CENTER : [KSA_CENTER[0] - 18, KSA_CENTER[1] + 6],
          zoom: reduce ? overviewZoom(w) : 1.6,
          pitch: reduce ? 30 : 0,
          bearing: 0,
          attributionControl: true,
          config: {
            basemap: {
              lightPreset: lightPresetFor(new Date(), fixedPreset),
              showPointOfInterestLabels: false,
              showTransitLabels: false,
            },
          },
        });
      } catch {
        setMode('flat');
        return;
      }
      mapRef.current = map;
      map.on('error', () => undefined);
      map.on('zoom', () => setZoomedIn(map.getZoom() >= CITY_ZOOM));
      map.on('moveend', () => declutterRef.current());
      map.on('load', () => {
        if (disposed) return;
        // indicative neighbourhood shading, beneath the 3D buildings
        map.addSource('indicators', { type: 'geojson', data: kingdomIndicators() });
        map.addLayer({
          id: 'indicators-fill',
          type: 'fill',
          source: 'indicators',
          slot: 'middle',
          minzoom: CITY_ZOOM,
          paint: {
            'fill-color': CLAY,
            'fill-opacity': ['interpolate', ['linear'], ['get', 'value'], 0, 0.05, 1, 0.34],
          },
        });
        map.addSource('properties', {
          type: 'geojson',
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 13,
          data: features(properties),
        });
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          slot: 'top',
          source: 'properties',
          minzoom: CITY_ZOOM,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': CLAY,
            'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22],
            'circle-opacity': 0.9,
          },
        });
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'properties',
          minzoom: CITY_ZOOM,
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
          paint: { 'text-color': '#F4EEE4' },
        });
        map.addLayer({
          id: 'property-glow',
          type: 'circle',
          slot: 'top',
          source: 'properties',
          minzoom: CITY_ZOOM,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-emissive-strength': 1,
            'circle-color': CLAY_LIGHT,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 14, 15, 46],
            'circle-blur': 1,
            'circle-opacity': 0.6,
          },
        });
        map.addLayer({
          id: 'property-dot',
          type: 'circle',
          slot: 'top',
          source: 'properties',
          minzoom: CITY_ZOOM,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-emissive-strength': 1,
            'circle-color': [
              'match',
              ['get', 'status'],
              'late',
              STATUS_COLOR.late,
              'warn',
              STATUS_COLOR.warn,
              CLAY,
            ],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 15, 15],
            'circle-stroke-color': '#F4EEE4',
            'circle-stroke-width': 2,
          },
        });
        map.on('click', 'property-dot', (e) => {
          const id = (e.features?.[0] as Feat | undefined)?.properties?.id as string | undefined;
          if (id) cb.current.onSelect(id);
        });
        map.on('click', 'clusters', (e) => {
          const f = e.features?.[0] as Feat | undefined;
          if (!f?.geometry) return;
          map.easeTo({
            center: f.geometry.coordinates as [number, number],
            zoom: map.getZoom() + 2,
            duration: reduce ? 0 : 600,
          });
        });
        for (const l of ['property-dot', 'clusters']) {
          map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
        }

        // one HTML pin per city (real buttons: keyboard and screen-reader friendly, Arabic shaped by the browser)
        for (const c of CITIES) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'city-pin';
          b.dataset.city = c.id;
          b.addEventListener('click', () => cb.current.onCity(c.id));
          const marker = new mapboxgl.Marker({ element: b, anchor: 'bottom' })
            .setLngLat(c.coords)
            .addTo(map);
          // Mapbox marks marker elements as images; these are real buttons
          b.removeAttribute('role');
          markerStore.set(c.id, { marker, el: b });
        }
        setMode('map');

        // the arrival: from space onto the Kingdom
        if (!reduce) {
          map.flyTo({
            center: KSA_CENTER,
            zoom: overviewZoom(el.current?.clientWidth ?? 1200),
            pitch: 30,
            duration: 4200,
            curve: 1.2,
            essential: false,
          });
        }
      });
    });

    return () => {
      disposed = true;
      for (const m of markerStore.values()) m.marker.remove();
      markerStore.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; data, city and selection are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // city pins: label, count and visibility follow the data and the camera
  useEffect(() => {
    if (mode !== 'map') return;
    for (const pin of cities) {
      const m = markers.current.get(pin.id);
      if (!m) continue;
      m.el.replaceChildren();
      const label = document.createElement('span');
      label.className = 'city-pin__label';
      label.textContent = pin.count > 0 ? `${pin.label} · ${pin.count}` : pin.label;
      const dot = document.createElement('span');
      dot.className = 'city-pin__dot';
      label.setAttribute('aria-hidden', 'true');
      dot.setAttribute('aria-hidden', 'true');
      m.el.append(label, dot);
      m.el.setAttribute('aria-label', cityLabel(pin));
      m.el.dataset.has = pin.count > 0 ? '1' : '0';
      m.el.dataset.active = pin.id === cityId ? '1' : '0';
      m.el.hidden = zoomedIn;
    }
    declutter();
  }, [cities, cityId, zoomedIn, mode, cityLabel]);

  // data → map
  useEffect(() => {
    if (mode !== 'map') return;
    const src = mapRef.current?.getSource('properties') as GeoJSONSource | undefined;
    src?.setData(features(properties));
  }, [properties, mode]);

  // keep the lighting on Riyadh's clock (checked every minute)
  useEffect(() => {
    if (mode !== 'map') return;
    const tick = () =>
      mapRef.current?.setConfigProperty(
        'basemap',
        'lightPreset',
        lightPresetFor(new Date(), fixedPreset),
      );
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [mode, fixedPreset]);

  // city → fly into it (or back out to the Kingdom)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'map') return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const c = cityById(cityId);
    if (c) {
      map.flyTo({
        center: c.coords,
        zoom: c.zoom,
        pitch: 58,
        bearing: -14,
        duration: reduce ? 0 : 2600,
        essential: false,
      });
    } else if (map.getZoom() > 5) {
      map.flyTo({
        center: KSA_CENTER,
        zoom: overviewZoom(el.current?.clientWidth ?? 1200),
        pitch: 30,
        bearing: 0,
        duration: reduce ? 0 : 2400,
        essential: false,
      });
    }
  }, [cityId, mode]);

  // property → fly to it at ~60°
  useEffect(() => {
    const p = properties.find((x) => x.id === selectedId);
    const map = mapRef.current;
    if (!p || !map || mode !== 'map') return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo({
      center: p.coords,
      zoom: 15.4,
      pitch: 60,
      bearing: map.getBearing() + 18,
      duration: reduce ? 0 : 2500,
      essential: false,
    });
  }, [selectedId, properties, mode]);

  if (mode === 'flat') return <FlatKingdom {...props} />;
  return (
    <div className="relative size-full" role="region" aria-label={mapLabel}>
      <div ref={el} className="size-full" />
      {mode === 'loading' && (
        <div className="skeleton absolute inset-0 !rounded-none" aria-hidden="true" />
      )}
    </div>
  );
}

// ----------------------------------------------------------------- flat schematic

const KSA_VIEW = {
  west: KSA_BOUNDS[0][0],
  east: KSA_BOUNDS[1][0],
  south: KSA_BOUNDS[0][1],
  north: KSA_BOUNDS[1][1],
};
/** Width / height of the Kingdom box once longitudes are shrunk by cos(latitude). */
const ASPECT =
  ((KSA_VIEW.east - KSA_VIEW.west) * Math.cos((24 * Math.PI) / 180)) /
  (KSA_VIEW.north - KSA_VIEW.south);
const OUTLINE_D =
  KSA_OUTLINE.map((pt, i) => {
    const [x, y] = project(pt, KSA_VIEW);
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z';

/**
 * Which overview pins stay buttons. On a phone-sized schematic some cities sit on top of each other
 * (Dammam and Khobar, Makkah and Jeddah); the busier one, then the region capital, keeps the button
 * and the other becomes a dot. Every city stays reachable from the city list. Sized for a 380px-wide
 * map so the server and the browser agree.
 */
function tappablePins(cities: CityPin[]): Set<string> {
  const W = 380;
  const H = W / ASPECT;
  const order = [...cities].sort(
    (a, b) =>
      b.count - a.count || Number(!!cityById(b.id)?.capital) - Number(!!cityById(a.id)?.capital),
  );
  const kept: Array<[number, number]> = [];
  const out = new Set<string>();
  for (const pin of order) {
    const c = cityById(pin.id);
    if (!c) continue;
    const [x, y] = project(c.coords, KSA_VIEW);
    const px: [number, number] = [(x / 100) * W, (y / 100) * H];
    if (kept.some(([kx, ky]) => Math.hypot(kx - px[0], ky - px[1]) < 28)) continue;
    kept.push(px);
    out.add(pin.id);
  }
  return out;
}

/** Flat schematic of the Kingdom: city pins at the overview, property pins inside a city. */
function FlatKingdom({
  properties,
  selectedId,
  onSelect,
  cities,
  cityId,
  onCity,
  mapLabel,
  cityLabel,
  flatNote,
}: MapViewProps) {
  const city = cityById(cityId);
  let view = KSA_VIEW;
  if (city) {
    const halfW = 0.26;
    const halfH = (halfW * Math.cos((city.coords[1] * Math.PI) / 180)) / ASPECT;
    view = {
      west: city.coords[0] - halfW,
      east: city.coords[0] + halfW,
      south: city.coords[1] - halfH,
      north: city.coords[1] + halfH,
    };
  }
  const tappable = tappablePins(cities);
  const inView = (p: MapProperty) =>
    p.coords[0] > view.west &&
    p.coords[0] < view.east &&
    p.coords[1] > view.south &&
    p.coords[1] < view.north;

  return (
    <div
      role="region"
      aria-label={mapLabel}
      data-testid="flat-map"
      className="relative grid size-full place-items-center overflow-hidden bg-[#140e0b] [container-type:size]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(circle at 55% 45%, #5a2e1a 0%, transparent 62%)' }}
      />
      <div
        key={city?.id ?? 'ksa'}
        className="rise-in relative"
        style={{ aspectRatio: ASPECT, width: `min(92cqw, calc(84cqh * ${ASPECT}))` }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
        >
          {city ? (
            <>
              {Array.from({ length: 9 }, (_, i) => (
                <g key={i} stroke="#F4EEE4" strokeOpacity="0.07" strokeWidth="0.3">
                  <line x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" />
                  <line x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} />
                </g>
              ))}
              <ellipse
                cx="50"
                cy="50"
                rx="30"
                ry="30"
                fill="none"
                stroke="#D9825A"
                strokeOpacity="0.3"
                strokeDasharray="1 2"
                strokeWidth="0.4"
              />
            </>
          ) : (
            <path
              d={OUTLINE_D}
              fill="#2a1d15"
              stroke="#D9825A"
              strokeOpacity="0.6"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {!city &&
          cities.map((pin) => {
            const c = cityById(pin.id);
            if (!c) return null;
            const [x, y] = project(c.coords, view);
            if (!tappable.has(pin.id)) {
              return (
                <span
                  key={pin.id}
                  aria-hidden="true"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={cn(
                    'absolute block -translate-x-1/2 -translate-y-1/2 rounded-full border border-sand/70',
                    pin.count > 0 ? 'size-2.5 bg-brand' : 'size-1.5 bg-stone',
                  )}
                />
              );
            }
            return (
              <button
                key={pin.id}
                type="button"
                aria-label={cityLabel(pin)}
                onClick={() => onCity(pin.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="group absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'block rounded-full border border-sand/80 transition-transform duration-300 ease-rk group-hover:scale-125',
                    pin.count > 0 ? 'size-3.5 bg-brand' : 'size-2 bg-stone',
                  )}
                  style={
                    pin.count > 0 ? { boxShadow: '0 0 14px 3px rgba(217,130,90,.45)' } : undefined
                  }
                />
                {pin.count > 0 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[70%] whitespace-nowrap rounded-full bg-night/85 px-2 py-0.5 text-caption text-sand"
                  >
                    {pin.label} · {pin.count}
                  </span>
                )}
              </button>
            );
          })}

        {city &&
          properties.filter(inView).map((p) => {
            const [x, y] = project(p.coords, view);
            const on = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                aria-label={p.name}
                aria-pressed={on}
                onClick={() => onSelect(p.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-3 rounded-full border-2 border-sand transition-transform duration-300 ease-rk',
                    p.status === 'late'
                      ? 'bg-[#FF5A3C]'
                      : p.status === 'warn'
                        ? 'bg-[#E8A23A]'
                        : 'bg-brand',
                    on && 'scale-150',
                  )}
                  style={{ boxShadow: '0 0 18px 4px rgba(217,130,90,.5)' }}
                />
              </button>
            );
          })}
      </div>
      <p className="absolute bottom-3 end-3 rounded-full bg-night/70 px-3 py-1 text-caption text-sand/80">
        {flatNote}
      </p>
    </div>
  );
}
