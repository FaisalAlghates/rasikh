'use client';

import type { Map as MapboxMap } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { RIYADH_CENTER, lightPresetFor, type LightPreset } from '@/lib/map/riyadh';
import { SAMPLE_PROPERTIES, sampleIndicators, type SampleProperty } from '@/lib/map/sample-data';

export interface MapViewProps {
  properties: SampleProperty[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Pin the lighting (marketing pages use 'dusk'); otherwise it follows Riyadh's local time. */
  fixedPreset?: LightPreset;
  showIndicators?: boolean;
  /** Accessible names for the fallback markers. */
  labelFor: (id: string) => string;
  mapLabel: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
/** Minimal shape of a queried map feature (mapbox-gl's own type omits geometry details). */
type Feat = { properties?: Record<string, unknown> | null; geometry?: { coordinates?: unknown } };
const CLAY = '#B5532C';
const CLAY_LIGHT = '#D9825A';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Mapbox Standard (3D buildings, lighting that follows Riyadh's clock). The bundle loads lazily.
 * Without a token or without WebGL it renders a flat schematic with the same interactions.
 */
export function MapView(props: MapViewProps) {
  const { properties, selectedId, onSelect, fixedPreset, showIndicators = true, mapLabel } = props;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mode, setMode] = useState<'loading' | 'map' | 'flat'>('loading');
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!TOKEN || !webglOk()) {
      setMode('flat');
      return;
    }
    let disposed = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    void import('mapbox-gl').then(async (mod) => {
      if (disposed || !el.current) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = TOKEN;
      let map: MapboxMap;
      try {
        map = new mapboxgl.Map({
          container: el.current,
          style: 'mapbox://styles/mapbox/standard',
          center: RIYADH_CENTER,
          zoom: 11.2,
          pitch: 55,
          bearing: -12,
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
      map.on('load', () => {
        if (disposed) return;
        // neighbourhood indicators (sample): a light layer beneath the 3D buildings
        if (showIndicators) {
          map.addSource('indicators', { type: 'geojson', data: sampleIndicators() });
          map.addLayer({
            id: 'indicators-fill',
            type: 'fill',
            source: 'indicators',
            slot: 'middle',
            paint: {
              'fill-color': CLAY,
              'fill-opacity': ['interpolate', ['linear'], ['get', 'value'], 0, 0.06, 1, 0.38],
            },
          });
        }
        map.addSource('properties', {
          type: 'geojson',
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 13,
          data: {
            type: 'FeatureCollection',
            features: properties.map((p) => ({
              type: 'Feature',
              properties: { id: p.id },
              geometry: { type: 'Point', coordinates: p.coords },
            })),
          },
        });
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          slot: 'top',
          source: 'properties',
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
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
          paint: { 'text-color': '#F4EEE4' },
        });
        // soft glow under each property, then the clay marker
        map.addLayer({
          id: 'property-glow',
          type: 'circle',
          slot: 'top',
          source: 'properties',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-emissive-strength': 1,
            'circle-color': CLAY_LIGHT,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 15, 46],
            'circle-blur': 1,
            'circle-opacity': 0.6,
          },
        });
        map.addLayer({
          id: 'property-dot',
          type: 'circle',
          slot: 'top',
          source: 'properties',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-emissive-strength': 1,
            'circle-color': CLAY,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 15, 15],
            'circle-stroke-color': '#F4EEE4',
            'circle-stroke-width': 2,
          },
        });
        map.on('click', 'property-dot', (e) => {
          const id = (e.features?.[0] as Feat | undefined)?.properties?.id as string | undefined;
          if (id) selectRef.current(id);
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
        setMode('map');
      });
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; data and selection are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // select → fly to the property at ~60° pitch
  useEffect(() => {
    const p = properties.find((x) => x.id === selectedId);
    const map = mapRef.current;
    if (!p || !map || mode !== 'map') return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo({
      center: p.coords,
      zoom: 15.6,
      pitch: 60,
      bearing: map.getBearing() + 18,
      duration: reduce ? 0 : 2500,
      essential: false,
    });
  }, [selectedId, properties, mode]);

  if (mode === 'flat') {
    return <FlatMap {...props} />;
  }
  return (
    <div className="relative size-full" role="region" aria-label={mapLabel}>
      <div ref={el} className="size-full" />
      {mode === 'loading' && (
        <div className="skeleton absolute inset-0 !rounded-none" aria-hidden="true" />
      )}
    </div>
  );
}

/** Flat schematic: same data, same selection, no WebGL or token needed. */
function FlatMap({ properties, selectedId, onSelect, labelFor, mapLabel }: MapViewProps) {
  const lons = SAMPLE_PROPERTIES.map((p) => p.coords[0]);
  const lats = SAMPLE_PROPERTIES.map((p) => p.coords[1]);
  const [minX, maxX, minY, maxY] = [
    Math.min(...lons),
    Math.max(...lons),
    Math.min(...lats),
    Math.max(...lats),
  ];
  return (
    <div
      role="region"
      aria-label={mapLabel}
      data-testid="flat-map"
      className="relative size-full overflow-hidden bg-[#140e0b]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(circle at 60% 40%, #6e3820 0%, transparent 60%)' }}
      />
      {properties.map((p) => {
        const x = 8 + ((p.coords[0] - minX) / (maxX - minX || 1)) * 84;
        const y = 8 + (1 - (p.coords[1] - minY) / (maxY - minY || 1)) * 84;
        const on = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            aria-label={labelFor(p.id)}
            aria-pressed={on}
            onClick={() => onSelect(p.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-3 rounded-full border-2 border-sand bg-brand transition-transform duration-300 ease-rk ${on ? 'scale-150' : ''}`}
              style={{ boxShadow: '0 0 18px 4px rgba(217,130,90,.5)' }}
            />
          </button>
        );
      })}
    </div>
  );
}
