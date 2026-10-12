'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from '@/i18n/navigation';
import type { NajdScene } from '@/lib/scene/NajdScene';

type Mode = 'story' | 'ambient' | 'off';

/** Landing tells the story; sign-in and onboarding get a calm version; everything else is plain. */
function modeFor(path: string): Mode {
  if (path === '/') return 'story';
  if (path.startsWith('/auth') || path.startsWith('/onboarding')) return 'ambient';
  return 'off';
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Persistent full-viewport 3D backdrop. It loads after the page is interactive (so the headline
 * stays the LCP element), degrades to the static poster on weak devices, and renders a single
 * still frame for people who prefer reduced motion.
 */
export function SceneBackdrop() {
  const pathname = usePathname();
  const mode = modeFor(pathname);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<NajdScene | null>(null);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const active = mode !== 'off';

  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    html.dataset.immersive = '1';
    const unmarkOnly = () => {
      delete html.dataset.immersive;
    };
    const canvas = canvasRef.current;
    if (!canvas) return unmarkOnly;
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    // Automated browsers (tests, crawlers) get the illustrated dusk; software WebGL would starve them.
    // Visual tests opt in with window.__RK_FORCE_SCENE = true.
    const forced = (window as { __RK_FORCE_SCENE?: boolean }).__RK_FORCE_SCENE === true;
    if (navigator.webdriver && !forced) {
      html.dataset.scene = 'off';
      return () => {
        unmarkOnly();
        delete html.dataset.scene;
      };
    }
    if (nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory < 2)) {
      html.dataset.scene = 'off';
      return unmarkOnly;
    }
    if (!webglAvailable()) {
      html.dataset.scene = 'off';
      return () => {
        unmarkOnly();
        delete html.dataset.scene;
      };
    }

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const low =
      innerWidth < 768 || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    let cancelled = false;
    let raf = 0;
    const cleanups: Array<() => void> = [];

    const boot = async () => {
      const { NajdScene } = await import('@/lib/scene/NajdScene');
      if (cancelled) return;
      let scene: NajdScene;
      try {
        scene = new NajdScene(canvas, { quality: low ? 'low' : 'high' });
      } catch {
        return; // context creation failed: keep the poster
      }
      try {
        await scene.init();
      } catch {
        scene.dispose();
        return;
      }
      if (cancelled) {
        scene.dispose();
        return;
      }
      sceneRef.current = scene;
      const root = document.documentElement;
      scene.onFirstFrame = () => {
        canvas.dataset.ready = 'true';
        root.dataset.scene = 'on';
      };
      scene.onDegrade = () => {
        canvas.dataset.ready = 'false';
        root.dataset.scene = 'degraded';
      };
      scene.setMode(modeRef.current === 'story' ? 'story' : 'ambient');
      scene.setBias(root.dir === 'rtl' ? 1 : -1);

      const size = () => scene.resize(innerWidth, innerHeight, devicePixelRatio || 1);
      size();

      const stops = () => Array.from(document.querySelectorAll<HTMLElement>('[data-scene-stop]'));
      const progress = () => {
        if (modeRef.current !== 'story') return 0;
        const els = stops();
        if (els.length < 2) return 0;
        const probe = scrollY + innerHeight * 0.4;
        const tops = els.map((e) => e.getBoundingClientRect().top + scrollY);
        let i = 0;
        while (i < tops.length - 1 && tops[i + 1]! <= probe) i++;
        if (i >= tops.length - 1) return 1;
        const t = (probe - tops[i]!) / Math.max(1, tops[i + 1]! - tops[i]!);
        return (i + Math.min(1, Math.max(0, t))) / (tops.length - 1);
      };

      if (reduce) {
        scene.renderStill(0);
        const onResize = () => {
          size();
          scene.renderStill(0);
        };
        addEventListener('resize', onResize);
        cleanups.push(() => removeEventListener('resize', onResize));
      } else {
        const onScroll = () => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            scene.setScrollProgress(progress());
          });
        };
        const onPointer = (e: PointerEvent) =>
          scene.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
        const onVisibility = () => (document.hidden ? scene.stop() : scene.start());
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('resize', size);
        addEventListener('pointermove', onPointer, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        cleanups.push(() => {
          removeEventListener('scroll', onScroll);
          removeEventListener('resize', size);
          removeEventListener('pointermove', onPointer);
          document.removeEventListener('visibilitychange', onVisibility);
        });
        scene.setScrollProgress(progress());
        scene.start();
      }
    };

    // The 3D city is decoration, so it never competes with the page load: it starts on the
    // visitor's first interaction, or after a few quiet seconds, whichever comes first.
    const triggers = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'] as const; // real input only: the smooth-scroll engine's own scroll events must not start the scene
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disarm = () => {
      triggers.forEach((t) => removeEventListener(t, go));
      clearTimeout(timer);
    };
    function go(e?: Event) {
      if (e && !e.isTrusted) return;
      if (started) return;
      started = true;
      disarm();
      const run = () => void boot();
      if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1200 });
      else setTimeout(run, 100);
    }
    const arm = () => {
      triggers.forEach((t) => addEventListener(t, go, { passive: true }));
      timer = setTimeout(go, 8000);
    };
    if (document.readyState === 'complete') arm();
    else addEventListener('load', arm, { once: true });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      cancelAnimationFrame(raf);
      removeEventListener('load', arm);
      disarm();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      delete document.documentElement.dataset.scene;
      delete document.documentElement.dataset.immersive;
    };
  }, [active]);

  useEffect(() => {
    sceneRef.current?.setMode(mode === 'story' ? 'story' : 'ambient');
  }, [mode]);

  if (!active) return null;
  return (
    <>
      {/* Dark base so the immersive pages stay readable even without WebGL. */}
      <div aria-hidden="true" className="fixed inset-0 -z-20 bg-[#0b0908]" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="scene-canvas fixed inset-0 -z-10 h-full w-full"
      />
      <div
        aria-hidden="true"
        className={
          mode === 'ambient'
            ? 'scene-scrim fixed inset-0 -z-10'
            : 'scene-vignette fixed inset-0 -z-10'
        }
      />
    </>
  );
}
