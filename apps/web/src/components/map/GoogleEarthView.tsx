'use client';

import * as RDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/** Set when a Google Maps key (with the Maps JavaScript API enabled, restricted to our domain) is configured. */
export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

interface Maps3D {
  Map3DElement: new (o: Record<string, unknown>) => HTMLElement;
  Marker3DElement: new (o: Record<string, unknown>) => HTMLElement;
}
type GoogleNs = { maps: { importLibrary(name: 'maps3d'): Promise<Maps3D> } };

let loading: Promise<void> | null = null;

/** The Maps JavaScript API with the 3D library (https://developers.google.com/maps/documentation/javascript/3d/get-started). */
export function mapsScriptUrl(key: string) {
  return `https://maps.googleapis.com/maps/api/js?loading=async&key=${encodeURIComponent(key)}&libraries=maps3d`;
}

function loadGoogle(key: string): Promise<void> {
  if ((window as { google?: GoogleNs }).google?.maps?.importLibrary) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = mapsScriptUrl(key);
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('google_maps_load_failed'));
    };
    document.head.append(s);
  });
  return loading;
}

/**
 * Google's photorealistic 3D view of a property's location (the same imagery as Google Maps and Earth), in a dialog.
 * Photorealistic 3D tiles are Google's, so they are shown with Google's own element and attribution, never copied or
 * cached. Needs NEXT_PUBLIC_GOOGLE_MAPS_KEY; without it the button is not offered.
 */
export function GoogleEarthView({
  name,
  coords,
  open,
  onOpenChange,
}: {
  name: string;
  coords: [number, number];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('portfolio');
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    if (!open || !GOOGLE_KEY) return;
    let gone = false;
    let el: HTMLElement | undefined;
    setState('loading');
    // the dialog's content mounts a tick after `open`
    const timer = setTimeout(() => {
      void loadGoogle(GOOGLE_KEY)
        .then(async () => {
          const { Map3DElement, Marker3DElement } = await (
            window as unknown as { google: GoogleNs }
          ).google.maps.importLibrary('maps3d');
          if (gone || !box.current) return;
          const [lng, lat] = coords;
          el = new Map3DElement({
            center: { lat, lng, altitude: 0 },
            range: 260,
            tilt: 67.5,
            heading: 20,
            mode: 'SATELLITE',
          });
          el.style.cssText = 'display:block;width:100%;height:100%';
          el.append(
            new Marker3DElement({
              position: { lat, lng, altitude: 0 },
              extruded: true,
              label: name,
            }),
          );
          box.current.replaceChildren(el);
          setState('ok');
        })
        .catch(() => !gone && setState('fail'));
    }, 50);
    return () => {
      gone = true;
      clearTimeout(timer);
      el?.remove();
    };
  }, [open, coords, name]);

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-night/70" />
        <RDialog.Content
          className="hairline fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg bg-surface text-text md:inset-10"
          data-testid="google-earth"
        >
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <RDialog.Title className="text-h3 font-semibold">{name}</RDialog.Title>
              <RDialog.Description className="text-small text-text-muted">
                {t('googleNote')}
              </RDialog.Description>
            </div>
            <RDialog.Close
              aria-label={t('close')}
              className="inline-flex size-10 items-center justify-center rounded-md text-text-muted hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </RDialog.Close>
          </div>
          <div className="relative min-h-0 flex-1 bg-night">
            <div ref={box} className="size-full" />
            {state !== 'ok' && (
              <p
                role={state === 'fail' ? 'alert' : 'status'}
                className="absolute inset-0 flex items-center justify-center p-6 text-center text-small text-sand"
              >
                {state === 'fail' ? t('googleFail') : t('googleLoading')}
              </p>
            )}
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
