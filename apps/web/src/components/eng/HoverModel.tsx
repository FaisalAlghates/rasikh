'use client';

import type { DesignPlan } from '@rasikh/shared';
import type { Mesh } from 'three';
import { Box } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** The live scene: a realistic building on its plot, the camera swinging with the pointer. */
function Scene({ plan, onFail }: { plan: DesignPlan; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => undefined as void;
    void Promise.all([
      import('three'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      import('@/lib/eng/model3d'),
    ])
      .then(([THREE, { RoomEnvironment }, { buildModel }]) => {
        const el = canvas.current;
        const wrap = box.current;
        if (disposed || !el || !wrap) return;
        const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.92;
        const scene = new THREE.Scene();
        // a soft sky and a reflection environment so glass and render catch light
        const sky = document.createElement('canvas');
        sky.width = 4;
        sky.height = 256;
        const sg = sky.getContext('2d')!;
        const grad = sg.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#8fb8dc');
        grad.addColorStop(0.55, '#d8e6f0');
        grad.addColorStop(1, '#f3ead9');
        sg.fillStyle = grad;
        sg.fillRect(0, 0, 4, 256);
        const skyTex = new THREE.CanvasTexture(sky);
        skyTex.colorSpace = THREE.SRGBColorSpace;
        scene.background = skyTex;
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.55;
        scene.fog = new THREE.Fog(0xe9e2d4, 140, 320);

        const { plot, footprint: fp, floors, floorHeight } = plan;
        const cx = fp.x + fp.w / 2;
        const cz = -(fp.y + fp.h / 2);
        const height = floors * floorHeight;
        // the street in front of the plot and a wide pavement of ground around it
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(400, 400),
          new THREE.MeshStandardMaterial({ color: 0xc4b89f, roughness: 1 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(plot.width / 2, -0.05, -plot.depth / 2);
        ground.receiveShadow = true;
        scene.add(ground);
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(400, 12),
          new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.95 }),
        );
        road.rotation.x = -Math.PI / 2;
        road.position.set(plot.width / 2, -0.03, 8);
        road.receiveShadow = true;
        scene.add(road);

        const model = buildModel(plan, { floorsShown: floors, realistic: true });
        scene.add(model);

        const sun = new THREE.DirectionalLight(0xfff1dc, 3);
        sun.position.set(cx + 40, 55, cz + 35);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const span = Math.max(plot.width, plot.depth);
        Object.assign(sun.shadow.camera, {
          left: -span,
          right: span,
          top: span,
          bottom: -span,
          far: span * 6,
        });
        sun.shadow.bias = -0.0004;
        sun.target.position.set(cx, 0, cz);
        scene.add(sun, sun.target, new THREE.HemisphereLight(0xdfeaf5, 0xb8a98f, 0.35));

        const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 600);
        const radius = Math.max(fp.w, fp.h, height * 1.6) * 1.9 + 6;
        const target = new THREE.Vector3(cx, height * 0.38, cz);
        // front three-quarter at rest; the pointer swings the camera around and tips it up and down
        let az = -0.55;
        let el2 = 0.3;
        let wantAz = az;
        let wantEl = el2;
        const onMove = (e: PointerEvent) => {
          const r = wrap.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          wantAz = -0.55 + x * Math.PI * 1.5;
          wantEl = 0.3 - y * 0.5;
        };
        wrap.addEventListener('pointermove', onMove);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let raf = 0;
        const loop = () => {
          const k = reduce ? 1 : 0.08;
          az += (wantAz - az) * k;
          el2 += (wantEl - el2) * k;
          const e = Math.max(0.08, Math.min(0.9, el2));
          camera.position.set(
            target.x + radius * Math.sin(az) * Math.cos(e),
            target.y + radius * Math.sin(e),
            target.z + radius * Math.cos(az) * Math.cos(e),
          );
          camera.lookAt(target);
          renderer.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        const resize = () => {
          const w = wrap.clientWidth || 600;
          const h = wrap.clientHeight || 400;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        resize();
        loop();
        cleanup = () => {
          cancelAnimationFrame(raf);
          wrap.removeEventListener('pointermove', onMove);
          ro.disconnect();
          pmrem.dispose();
          model.traverse((o) => {
            const m = o as Mesh;
            m.geometry?.dispose();
          });
          renderer.dispose();
        };
      })
      .catch(onFail);
    return () => {
      disposed = true;
      cleanup();
    };
    // one scene per hover; the plan does not change while it is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-lg" data-testid="hover-3d">
      <canvas ref={canvas} className="size-full" aria-hidden="true" />
    </div>
  );
}

/**
 * Shows a drawing and, when the pointer comes onto it (or it is focused or tapped), the same design as a lit 3D
 * model that turns with the pointer. The drawing stays in the layout so nothing jumps; reduced motion snaps the
 * camera to the pointer instead of easing.
 */
export function HoverModel({
  plan,
  children,
  className,
}: {
  plan: DesignPlan;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('eng');
  // the pointer shows it while over the design; the button pins it (keyboard, touch, or to keep it open)
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(webglOk()), []);
  const show = (hover || pinned) && ok === true;
  return (
    <div
      className={cn('relative', className)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
      data-3d={show ? 'on' : 'off'}
    >
      <div className={show ? 'invisible' : undefined}>{children}</div>
      {show && <Scene plan={plan} onFail={() => setOk(false)} />}
      {ok && (
        <button
          type="button"
          aria-pressed={pinned}
          onClick={() => setPinned((v) => !v)}
          className="hairline absolute bottom-2 end-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#fffdf9]/90 px-3 text-caption text-night"
        >
          <Box size={14} aria-hidden="true" />
          {t('view3d')}
        </button>
      )}
    </div>
  );
}
