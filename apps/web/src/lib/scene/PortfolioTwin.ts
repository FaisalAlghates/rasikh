/**
 * Portfolio digital twin: the owner's own properties as Najdi mud-brick buildings at dusk. Every floor cell is a
 * unit and its window glows in the unit's payment status (ok / soon / late / vacant). Drag to orbit, click a unit
 * to select it. Original procedural geometry, no external assets; a few dozen meshes for a typical portfolio.
 */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Shape,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { CellStatus, TwinBuilding, TwinPlan } from './twinPlan';

const CELL = { w: 1.5, h: 1.0, d: 1.5, gap: 0.12 };
const PLINTH_H = 0.35;

const STATUS_COLOR: Record<CellStatus, string> = {
  ok: '#F2C98A', // warm lit window
  soon: '#E8A23A', // amber
  late: '#FF5A3C', // clay-red, pulses
  vacant: '#2b2621', // dark, unlit
};

export interface TwinCallbacks {
  onHover: (unitId: string | null) => void;
  onSelect: (unitId: string | null) => void;
}

interface CellMesh extends Mesh {
  userData: { unitId: string; status: CellStatus; windows: Mesh[] };
}

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  rg.addColorStop(0, '#3a2418');
  rg.addColorStop(0.45, '#1f1712');
  rg.addColorStop(1, '#0E0D0B');
  g.fillStyle = rg;
  g.fillRect(0, 0, 512, 512);
  // faint survey rings, like a site plan
  g.strokeStyle = 'rgba(217,130,90,0.10)';
  g.lineWidth = 1.5;
  for (let r = 40; r < 256; r += 36) {
    g.beginPath();
    g.arc(256, 256, r, 0, Math.PI * 2);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** One shurfa (stepped Najdi crenellation), as a thin extruded triangle. */
function shurfaGeometry() {
  const s = new Shape();
  s.moveTo(-0.16, 0);
  s.lineTo(0.16, 0);
  s.lineTo(0, 0.32);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
}

export class PortfolioTwinScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(34, 1, 0.1, 400);
  private root = new Group();
  private cells: CellMesh[] = [];
  private buildings: Array<{ data: TwinBuilding; group: Group; top: number; born: number }> = [];
  private labels = new Map<string, HTMLElement>();
  private ray = new Raycaster();
  private pointer = new Vector2();
  private target = new Vector3(0, 2, 0);
  private azimuth = Math.PI * 0.25;
  private elevation = 0.62;
  private distance = 30;
  private lastInteraction = -1e9;
  private dragging = false;
  private dragFrom = { x: 0, y: 0, az: 0, el: 0, moved: 0 };
  private hovered: CellMesh | null = null;
  private selection: LineSegments | null = null;
  private selectedId: string | null = null;
  private raf = 0;
  private t0 = performance.now();
  private running = false;
  private readonly brick = new MeshStandardMaterial({ color: '#a8754f', roughness: 0.92 });
  private readonly brickAlt = new MeshStandardMaterial({ color: '#97653f', roughness: 0.95 });
  private readonly plinth = new MeshStandardMaterial({ color: '#2a2420', roughness: 1 });
  private readonly shurfa = shurfaGeometry();
  private readonly windowGeo = new PlaneGeometry(CELL.w * 0.42, CELL.h * 0.46);
  private readonly windowMats = new Map<CellStatus, MeshBasicMaterial>();

  constructor(
    private canvas: HTMLCanvasElement,
    private labelRoot: HTMLElement,
    private cb: TwinCallbacks,
    private opts: { reducedMotion: boolean; lowPower: boolean },
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: !opts.lowPower, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1 : 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !opts.lowPower;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor('#0E0D0B');
    this.scene.fog = new Fog('#0E0D0B', 40, 120);

    // dusk light: warm low sun, cool-to-earth sky
    this.scene.add(new HemisphereLight('#f6c9a0', '#140f0c', 0.85));
    const sun = new DirectionalLight('#ffb27a', 2.4);
    sun.position.set(-18, 16, 10);
    sun.castShadow = !opts.lowPower;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -30,
      right: 30,
      top: 30,
      bottom: -30,
      near: 1,
      far: 80,
    });
    this.scene.add(sun);

    for (const s of Object.keys(STATUS_COLOR) as CellStatus[]) {
      this.windowMats.set(
        s,
        new MeshBasicMaterial({ color: new Color(STATUS_COLOR[s]), transparent: s === 'late' }),
      );
    }

    const ground = new Mesh(
      new CircleGeometry(90, 64),
      new MeshStandardMaterial({ map: groundTexture(), roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground, this.root);

    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
  }

  // ------------------------------------------------------------------ data
  setPlan(plan: TwinPlan) {
    this.clear();
    const now = performance.now();
    plan.buildings.forEach((b, i) => {
      const group = new Group();
      group.position.set(b.x, 0, b.z);
      const w = b.cols * (CELL.w + CELL.gap) + 0.5;
      const pl = new Mesh(new BoxGeometry(w + 1.2, PLINTH_H, CELL.d + 1.7), this.plinth);
      pl.position.y = PLINTH_H / 2;
      pl.receiveShadow = true;
      group.add(pl);

      const floors = Math.max(1, b.floors);
      const slots = b.cells.length ? b.cells : [];
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < b.cols; c++) {
          const cell = slots.find((s) => s.floor === f && s.col === c);
          const x = (c - (b.cols - 1) / 2) * (CELL.w + CELL.gap);
          const y = PLINTH_H + f * (CELL.h + CELL.gap) + CELL.h / 2;
          const mesh = new Mesh(
            new BoxGeometry(CELL.w, CELL.h, CELL.d),
            (f + c) % 2 ? this.brickAlt : this.brick,
          ) as unknown as CellMesh;
          mesh.position.set(x, y, 0);
          mesh.castShadow = mesh.receiveShadow = !this.opts.lowPower;
          const status: CellStatus = cell?.status ?? 'vacant';
          const windows: Mesh[] = [];
          // a window on the two faces that look toward the camera's usual side
          for (const [px, pz, ry] of [
            [0, CELL.d / 2 + 0.005, 0],
            [CELL.w / 2 + 0.005, 0, Math.PI / 2],
            [0, -CELL.d / 2 - 0.005, Math.PI],
            [-CELL.w / 2 - 0.005, 0, -Math.PI / 2],
          ] as const) {
            const win = new Mesh(this.windowGeo, this.windowMats.get(status)!);
            win.position.set(px, -0.04, pz);
            win.rotation.y = ry;
            mesh.add(win);
            windows.push(win);
          }
          if (cell) {
            mesh.userData = { unitId: cell.unitId, status, windows };
            this.cells.push(mesh);
          }
          group.add(mesh);
        }
      }

      // shurfa crenellation along the roof edge
      const top = PLINTH_H + floors * (CELL.h + CELL.gap);
      const halfW = (b.cols * (CELL.w + CELL.gap) - CELL.gap) / 2;
      const halfD = CELL.d / 2;
      const crown = new Group();
      const place = (x: number, z: number, ry: number) => {
        const m = new Mesh(this.shurfa, this.brick);
        m.position.set(x, top - CELL.gap, z);
        m.rotation.y = ry;
        m.castShadow = !this.opts.lowPower;
        crown.add(m);
      };
      for (let x = -halfW + 0.2; x <= halfW - 0.1; x += 0.42) {
        place(x, halfD - 0.04, 0);
        place(x, -halfD - 0.04, 0);
      }
      for (let z = -halfD + 0.2; z <= halfD - 0.1; z += 0.42) {
        place(halfW - 0.04, z, Math.PI / 2);
        place(-halfW - 0.04, z, Math.PI / 2);
      }
      group.add(crown);

      this.root.add(group);
      this.buildings.push({ data: b, group, top, born: now + i * 120 });
      if (!this.opts.reducedMotion) group.scale.y = 0.001;
    });

    // frame the whole portfolio
    const tallest = this.buildings.reduce((m, b) => Math.max(m, b.top), 3);
    this.target.set(0, Math.min(tallest * 0.42, 5), 0);
    this.distance = Math.max(16, plan.radius * 1.7 + tallest * 1.2);
    this.camera.far = this.distance * 6;
    this.syncLabels();
    this.setSelected(this.selectedId);
    this.render();
  }

  private clear() {
    for (const b of this.buildings) {
      b.group.traverse((o: Object3D) => {
        const m = o as Mesh;
        if (m.isMesh && m.geometry !== this.shurfa && m.geometry !== this.windowGeo)
          m.geometry.dispose();
      });
      this.root.remove(b.group);
    }
    this.buildings = [];
    this.cells = [];
  }

  /** Building-name chips are plain HTML (real Arabic text, selectable by screen readers), placed every frame. */
  private syncLabels() {
    for (const el of this.labels.values()) el.remove();
    this.labels.clear();
    for (const b of this.buildings) {
      const el = document.createElement('div');
      el.className = 'twin-label';
      el.textContent = b.data.name;
      this.labelRoot.appendChild(el);
      this.labels.set(b.data.id, el);
    }
  }

  setSelected(id: string | null) {
    this.selectedId = id;
    if (this.selection) {
      this.selection.parent?.remove(this.selection);
      this.selection.geometry.dispose();
      this.selection = null;
    }
    const cell = this.cells.find((c) => c.userData.unitId === id);
    if (cell) {
      const edges = new LineSegments(
        new EdgesGeometry(new BoxGeometry(CELL.w + 0.08, CELL.h + 0.08, CELL.d + 0.08)),
        new LineBasicMaterial({ color: '#F4EEE4' }),
      );
      cell.add(edges);
      this.selection = edges;
    }
    this.render();
  }

  // ------------------------------------------------------------------ input
  private pick(e: PointerEvent): CellMesh | null {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObjects(this.cells, false)[0];
    return (hit?.object as CellMesh | undefined) ?? null;
  }
  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.dragFrom = { x: e.clientX, y: e.clientY, az: this.azimuth, el: this.elevation, moved: 0 };
    this.lastInteraction = performance.now();
  };
  private onMove = (e: PointerEvent) => {
    if (this.dragging) {
      const dx = e.clientX - this.dragFrom.x;
      const dy = e.clientY - this.dragFrom.y;
      this.dragFrom.moved = Math.max(this.dragFrom.moved, Math.hypot(dx, dy));
      if (this.dragFrom.moved > 4) {
        this.azimuth = this.dragFrom.az - dx * 0.006;
        this.elevation = Math.min(1.15, Math.max(0.22, this.dragFrom.el + dy * 0.004));
        this.lastInteraction = performance.now();
        this.render();
      }
      return;
    }
    const hit = this.pick(e);
    if (hit !== this.hovered) {
      this.hovered = hit;
      this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      this.cb.onHover(hit?.userData.unitId ?? null);
      this.render();
    }
  };
  private onUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.dragFrom.moved <= 4 && e.target === this.canvas) {
      const hit = this.pick(e);
      this.cb.onSelect(hit?.userData.unitId ?? null);
    }
  };
  private onLeave = () => {
    if (this.hovered) {
      this.hovered = null;
      this.cb.onHover(null);
      this.render();
    }
  };

  // ------------------------------------------------------------------ frame
  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    // narrow screens: step back so every building stays in view
    this.camera.fov = w < 640 ? 46 : 34;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame() {
    const now = performance.now();
    const idle = now - this.lastInteraction > 4000;
    if (!this.opts.reducedMotion && idle && !this.dragging) this.azimuth += 0.0011;
    for (const b of this.buildings) {
      if (b.group.scale.y < 1) b.group.scale.y = Math.max(0.001, easeOut((now - b.born) / 1100));
    }
    const pulse = 0.55 + 0.45 * Math.sin((now - this.t0) / 380);
    const lateMat = this.windowMats.get('late')!;
    lateMat.opacity = this.opts.reducedMotion ? 1 : pulse;
    this.render();
  }

  private render() {
    const { azimuth: a, elevation: e, distance: d, target: t } = this;
    this.camera.position.set(
      t.x + d * Math.cos(e) * Math.sin(a),
      t.y + d * Math.sin(e),
      t.z + d * Math.cos(e) * Math.cos(a),
    );
    this.camera.lookAt(t);
    // hovered unit: brighten its cell a touch
    for (const c of this.cells) c.scale.setScalar(c === this.hovered ? 1.06 : 1);
    this.renderer.render(this.scene, this.camera);
    // place the HTML name chips above each roof
    const rect = this.canvas.getBoundingClientRect();
    const v = new Vector3();
    for (const b of this.buildings) {
      const el = this.labels.get(b.data.id);
      if (!el) continue;
      v.set(b.data.x, b.top * b.group.scale.y + 0.9, b.data.z).project(this.camera);
      const x = Math.min(rect.width - 40, Math.max(40, ((v.x + 1) / 2) * rect.width));
      // keep chips of tall towers inside the frame
      const y = Math.min(rect.height - 12, Math.max(30, ((1 - v.y) / 2) * rect.height));
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      el.style.opacity = v.z < 1 && b.group.scale.y > 0.6 ? '1' : '0';
    }
  }

  dispose() {
    this.stop();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.clear();
    for (const el of this.labels.values()) el.remove();
    this.shurfa.dispose();
    this.windowGeo.dispose();
    this.renderer.dispose();
  }
}
