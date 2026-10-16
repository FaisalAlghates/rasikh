'use client';

import { furnish, type DesignPlan, type Plot } from '@rasikh/shared';
import { Download, Sofa, Square, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { cn } from '@/components/ui/cn';
import { download } from '@/lib/eng/data';
import { floorLabel } from '@/lib/eng/labels';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Live 3D model of the current plan: orbit, dollhouse cut by floor, empty/furnished, and a sun study at the plot.
 * Rebuilt from the same geometry on every plan edit. The AI render toggle needs a paid image model (not enabled).
 */
export function Model3D({ plan, plot, name }: { plan: DesignPlan; plot: Plot; name: string }) {
  const t = useTranslations('eng');
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<{
    three: typeof THREE;
    scene: THREE.Scene;
    sun: THREE.DirectionalLight;
    model?: THREE.Group;
    render: () => void;
  } | null>(null);
  const [ready, setReady] = useState<'loading' | 'ok' | 'none'>('loading');
  const [floors, setFloors] = useState(plan.floors);
  const [furnished, setFurnished] = useState(false);
  const [month, setMonth] = useState(6);
  const [hour, setHour] = useState(15);
  const furniture = useMemo(() => (furnished ? furnish(plan) : undefined), [furnished, plan]);
  const loc = plot.location ?? { lat: 24.7136, lng: 46.6753 };

  useEffect(() => setFloors(plan.floors), [plan.floors]);

  // set up three.js once
  useEffect(() => {
    if (!webglOk()) {
      setReady('none');
      return;
    }
    let disposed = false;
    let cleanup = () => undefined as void;
    void Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
    ]).then(([THREE, { OrbitControls }, { RoomEnvironment }]) => {
      if (disposed || !canvas.current || !box.current) return;
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas.current,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.shadowMap.enabled = true;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf4eee4);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 800);
      const cx = plan.plot.width / 2;
      const cz = -plan.plot.depth / 2;
      camera.position.set(
        // a three-quarter view of the street front, close enough to read the openings
        plan.footprint.x - plan.footprint.w * 0.45,
        plan.floors * plan.floorHeight + plan.footprint.h * 0.9,
        -plan.footprint.y + plan.footprint.h * 1.05,
      );
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(
        plan.footprint.x + plan.footprint.w / 2,
        (plan.floors * plan.floorHeight) / 3,
        -(plan.footprint.y + plan.footprint.h / 2),
      );
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.enableDamping = true;
      scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c9b4, 1.1));
      const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const span = Math.max(plan.plot.width, plan.plot.depth);
      Object.assign(sun.shadow.camera, {
        left: -span,
        right: span,
        top: span,
        bottom: -span,
        far: span * 6,
      });
      sun.target.position.set(cx, 0, cz);
      scene.add(sun, sun.target);
      let raf = 0;
      const render = () => {
        controls.update();
        renderer.render(scene, camera);
      };
      const loop = () => {
        render();
        raf = requestAnimationFrame(loop);
      };
      const resize = () => {
        const w = box.current?.clientWidth ?? 600;
        const h = box.current?.clientHeight ?? 400;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(box.current);
      resize();
      loop();
      api.current = { three: THREE, scene, sun, render };
      setReady('ok');
      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        pmrem.dispose();
        renderer.dispose();
      };
    });
    return () => {
      disposed = true;
      cleanup();
      api.current = null;
    };
    // the scene is created once; the model and the sun follow the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (re)build the model whenever the plan, the floors shown or the furniture change
  useEffect(() => {
    const a = api.current;
    if (!a || ready !== 'ok') return;
    let on = true;
    void import('@/lib/eng/model3d').then(({ buildModel }) => {
      if (!on || !api.current) return;
      if (a.model) {
        a.scene.remove(a.model);
        a.model.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
        });
      }
      a.model = buildModel(plan, { floorsShown: floors, furniture, realistic: true });
      a.scene.add(a.model);
    });
    return () => {
      on = false;
    };
  }, [plan, floors, furniture, ready]);

  // the sun for the chosen month and hour (Riyadh time) at the plot
  useEffect(() => {
    const a = api.current;
    if (!a || ready !== 'ok') return;
    void import('@/lib/eng/model3d').then(({ sunVector }) => {
      const date = new Date(Date.UTC(2026, month - 1, 21, hour - 3, 0));
      const v = sunVector(date, loc.lat, loc.lng, plot.northDeg);
      const span = Math.max(plan.plot.width, plan.plot.depth) * 2;
      a.sun.position.set(
        plan.plot.width / 2 + v.x * span,
        v.y * span,
        -plan.plot.depth / 2 + v.z * span,
      );
      a.sun.intensity = v.y < 0.05 ? 0.4 : 2.2;
    });
  }, [month, hour, ready, loc.lat, loc.lng, plot.northDeg, plan.plot.width, plan.plot.depth]);

  const exportGltf = async () => {
    const a = api.current;
    if (!a?.model) return;
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    // furniture never leaves the app with the model
    const copy = a.model.clone();
    copy.children.filter((c) => c.name.startsWith('furniture-')).forEach((c) => copy.remove(c));
    new GLTFExporter().parse(
      copy,
      (out) => download(`${name}.gltf`, JSON.stringify(out), 'model/gltf+json'),
      () => undefined,
      { binary: false },
    );
  };

  const btn = (on: boolean) =>
    cn(
      'hairline inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-small',
      on ? 'bg-brand text-on-brand' : 'text-text hover:bg-surface',
    );

  return (
    <div className="flex flex-col gap-3" data-testid="model-3d">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t('furnished')} className="flex gap-1">
          <button
            type="button"
            className={btn(!furnished)}
            aria-pressed={!furnished}
            onClick={() => setFurnished(false)}
          >
            <Square size={14} aria-hidden="true" />
            {t('empty')}
          </button>
          <button
            type="button"
            className={btn(furnished)}
            aria-pressed={furnished}
            onClick={() => {
              // the dollhouse view: open the ground floor so the furniture is seen from above
              setFurnished(true);
              setFloors(1);
            }}
          >
            <Sofa size={14} aria-hidden="true" />
            {t('furnished')}
          </button>
        </div>
        <div role="group" aria-label={t('aiRender')} className="flex gap-1">
          <button type="button" className={btn(true)} aria-pressed>
            {t('modelView')}
          </button>
          <button type="button" className={btn(false)} disabled aria-describedby="ai-render-off">
            <Sparkles size={14} aria-hidden="true" />
            {t('aiRender')}
          </button>
        </div>
        <label className="flex items-center gap-2 text-small">
          {t('floorsUpTo')}
          <select
            value={floors}
            onChange={(e) => setFloors(Number(e.target.value))}
            className="hairline min-h-10 rounded-md bg-surface px-2"
          >
            {Array.from({ length: plan.floors }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={btn(false)}
          onClick={() => void exportGltf()}
          disabled={ready !== 'ok'}
        >
          <Download size={14} aria-hidden="true" />
          {t('exportGltf')}
        </button>
      </div>
      <p id="ai-render-off" className="text-caption text-text-muted">
        {t('aiRenderOff')} {t('furnitureNote')}
      </p>
      <div
        ref={box}
        className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[#f4eee4] sm:h-[520px]"
      >
        <canvas
          ref={canvas}
          aria-hidden="true"
          className={cn('size-full', ready !== 'ok' && 'hidden')}
        />
        {ready === 'loading' && <div className="skeleton absolute inset-0" aria-hidden="true" />}
        {ready === 'none' && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-small text-text-muted">
            WebGL
          </p>
        )}
        <p className="absolute bottom-2 start-3 rounded-full bg-night/70 px-3 py-1 text-caption text-sand">
          {t('drag3d')}
        </p>
      </div>
      <fieldset className="hairline flex flex-wrap items-center gap-4 rounded-lg p-3">
        <legend className="px-1 text-small font-semibold">{t('sunStudy')}</legend>
        <label className="flex items-center gap-2 text-small">
          {t('sunDate')}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="hairline min-h-10 rounded-md bg-surface px-2"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { month: 'long' }).format(
                  new Date(2026, m - 1, 1),
                )}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 items-center gap-2 text-small">
          <span className="tabular min-w-20">{t('sunHour', { h: hour })}</span>
          <input
            type="range"
            min={6}
            max={18}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-full accent-[var(--rk-brand)]"
          />
        </label>
        {!plot.location && (
          <p className="w-full text-caption text-text-muted">{t('sunNoLocation')}</p>
        )}
      </fieldset>
      {/* the same model as text, for screen readers */}
      <ul className="sr-only" aria-label={t('model3dList')}>
        {Array.from({ length: plan.floors }, (_, f) => (
          <li key={f}>
            {floorLabel(t, plan, f)}: {plan.rooms.filter((r) => r.floor === f).length}
          </li>
        ))}
      </ul>
    </div>
  );
}
