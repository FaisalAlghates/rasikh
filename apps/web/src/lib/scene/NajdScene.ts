/**
 * "Najd Dusk" — a procedural 3D city of mud-brick towers with shurfa crenellations, seen at dusk.
 *
 * Concept: every lit triangular window is a documented home. The camera dollies down a street
 * as the visitor scrolls, windows ignite with progress and near the pointer, embers drift upward,
 * and the sun sinks toward the end of the street.
 *
 * Original artwork, no external assets. Everything is instanced (a handful of draw calls).
 */
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearSRGBColorSpace,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  SRGBColorSpace,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  Scene,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

export type SceneMode = 'story' | 'ambient';
export interface SceneOptions {
  /** `low` halves the window count, drops halos and embers, and caps the pixel ratio at 1. */
  quality: 'high' | 'low';
}

const raw = (hex: string) => new Color().setHex(parseInt(hex.slice(1), 16), LinearSRGBColorSpace);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Only full-height towers get windows (stepped tops do not). */
  tower: boolean;
}

// Camera keyframes along the street: [position, look-at]. One per landing section.
const KEYS: Array<[Vector3, Vector3]> = [
  [new Vector3(0, 2.8, 16), new Vector3(0, 7.5, -70)], // hero: low, looking down the street
  [new Vector3(5.5, 4.4, -14), new Vector3(-3, 8, -78)], // roles: closer, drifting right
  [new Vector3(-6.5, 8.8, -46), new Vector3(8, 6, -100)], // how it works: rising
  [new Vector3(1, 34, -76), new Vector3(0, 0, -110)], // record: bird's-eye
  [new Vector3(0, 3.6, -102), new Vector3(0, 8, -175)], // finale: toward the sun
];

const SKY = {
  top: ['#0b0908', '#060505'],
  mid: ['#26160e', '#110908'],
  horizon: ['#6e3820', '#2f170d'],
  sun: '#e0905f',
  fog: ['#6e3820', '#2f170d'], // equals the horizon so ground, haze and sky meet without a seam
};

/** Mixes two hex colours in sRGB space and keeps the result raw (as the custom shaders expect). */
const mix = (a: string, b: string, t: number) => raw(a).lerp(raw(b), t);

export class NajdScene {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(42, 1, 0.5, 700);
  private readonly fog = new FogExp2('#5a2d1a', 0.0105);
  private readonly sky: Mesh<SphereGeometry, ShaderMaterial>;
  private readonly windows: ShaderMaterial[] = [];
  private embers: Points | null = null;
  private emberMat: ShaderMaterial | null = null;
  private halo: InstancedMesh | null = null;
  private readonly sun: DirectionalLight;
  private groundGlow!: MeshBasicMaterial;
  private camPath!: CatmullRomCurve3;
  private lookPath!: CatmullRomCurve3;
  private sliceStart = 0;
  private readonly disposables: Array<{ dispose(): void }> = [];

  private quality: 'high' | 'low';
  private mode: SceneMode = 'story';
  private target = 0;
  private progress = 0;
  private pointer = new Vector2();
  private pointerS = new Vector2();
  private bias = 0;
  private raf = 0;
  private running = false;
  private t0 = 0;
  private lastT = 0;
  private slow = 0;
  private frames = 0;
  private width = 1;
  private height = 1;
  private dprCap: number;

  /** Called once if the device cannot hold a usable frame rate. */
  onDegrade?: () => void;
  /** Called after the first frame has been drawn. */
  onFirstFrame?: () => void;
  private firstDone = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: SceneOptions,
  ) {
    this.quality = opts.quality;
    this.dprCap = opts.quality === 'high' ? 2 : 1;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: opts.quality === 'high',
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor('#0b0908');
    this.scene.fog = this.fog;

    // ---- sky ----
    const skyMat = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: raw(SKY.top[0]!) },
        uMid: { value: raw(SKY.mid[0]!) },
        uHorizon: { value: raw(SKY.horizon[0]!) },
        uSun: { value: raw(SKY.sun) },
        uSunDir: { value: new Vector3(0.02, 0.04, -1).normalize() },
        uNight: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uMid, uHorizon, uSun, uSunDir;
        uniform float uNight;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.32, h));
          col = mix(col, uTop, smoothstep(0.22, 0.85, h));
          float s = max(dot(d, uSunDir), 0.0);
          float glow = pow(s, 46.0) * 0.72 + pow(s, 7.0) * 0.3 + pow(s, 2.0) * 0.05;
          col += uSun * glow * (1.0 - uNight * 0.55);
          // dither to avoid banding in the dark gradient
          col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 160.0;
          gl_FragColor = vec4(min(col, vec3(0.96)), 1.0);
        }`,
    });
    const skyGeo = new SphereGeometry(600, 32, 16);
    this.sky = new Mesh(skyGeo, skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.disposables.push(skyGeo, skyMat);

    // ---- lights ----
    const hemi = new HemisphereLight('#d9825a', '#1a1008', 0.55);
    this.sun = new DirectionalLight('#ffb27a', 2.3);
    this.sun.position.set(6, 22, -120); // from the sun side: rims edges, lights roofs
    const fill = new DirectionalLight('#7a4a36', 0.7);
    fill.position.set(8, 20, 60); // faint camera-side fill so fronts are not pitch black
    this.scene.add(hemi, this.sun, fill);
  }

  private overBudget() {
    return performance.now() - this.sliceStart > 8;
  }
  private async pause() {
    await new Promise<void>((r) => setTimeout(r, 0));
    this.sliceStart = performance.now();
  }

  /**
   * Builds the city in small slices (never a long main-thread task), then pre-compiles the shaders.
   * Call once before 
esize() and start().
   */
  async init(): Promise<void> {
    this.sliceStart = performance.now();
    // ---- city ----
    const rand = mulberry32(11);
    const boxes: Box[] = [];
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        let z = 24 + rand() * 6;
        const inner = 8 + row * 15 + rand() * 2;
        while (z > -190) {
          const w = 4.2 + rand() * 5 + row * 1.5;
          const d = 4.5 + rand() * 6;
          const base = 9 + rand() * 16 + row * 9 + (z < -70 ? rand() * 12 : 0);
          const x = side * (inner + w / 2);
          boxes.push({ x, y: base / 2, z: z - d / 2, w, h: base, d, tower: true });
          if (rand() < 0.45) {
            const sh = 2.6 + rand() * 3.4;
            boxes.push({
              x: x + (rand() - 0.5) * 0.6,
              y: base + sh / 2,
              z: z - d / 2,
              w: w * 0.68,
              h: sh,
              d: d * 0.68,
              tower: false,
            });
          }
          z -= d + 0.5 + rand() * 2.2;
        }
      }
    }
    // a few landmark towers deep in the street
    for (const [x, z, h] of [
      [-16, -128, 52],
      [20, -146, 60],
      [-9, -166, 46],
    ] as const) {
      boxes.push({ x, y: h / 2, z, w: 8, h, d: 8, tower: true });
      boxes.push({ x, y: h + 2.4, z, w: 5.4, h: 4.8, d: 5.4, tower: false });
    }

    const palette = ['#2b1d16', '#34241b', '#3d2b20', '#241812', '#31211a', '#463226'].map(
      (c) => new Color(c),
    );
    const boxGeo = new BoxGeometry(1, 1, 1);
    const wallMat = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
    const walls = new InstancedMesh(boxGeo, wallMat, boxes.length);
    const m = new Matrix4();
    const q = new Quaternion();
    boxes.forEach((b, i) => {
      m.compose(new Vector3(b.x, b.y, b.z), q, new Vector3(b.w, b.h, b.d));
      walls.setMatrixAt(i, m);
      walls.setColorAt(
        i,
        palette[Math.floor(rand() * palette.length)]!.clone().multiplyScalar(0.8 + rand() * 0.45),
      );
    });
    walls.instanceMatrix.needsUpdate = true;
    this.scene.add(walls);
    this.disposables.push(boxGeo, wallMat, walls);
    await this.pause();

    // shurfa: little pyramids along every roof edge
    const pts: Array<[number, number, number, number]> = [];
    for (const b of boxes) {
      if (this.overBudget()) await this.pause();
      const top = b.y + b.h / 2;
      const step = this.quality === 'high' ? 1.05 : 1.6;
      const nx = Math.max(2, Math.round(b.w / step));
      const nz = Math.max(2, Math.round(b.d / step));
      for (let i = 0; i <= nx; i++) {
        const x = b.x - b.w / 2 + (b.w * i) / nx;
        pts.push(
          [x, top, b.z + b.d / 2, 0.85 + rand() * 0.3],
          [x, top, b.z - b.d / 2, 0.85 + rand() * 0.3],
        );
      }
      for (let i = 1; i < nz; i++) {
        const z = b.z - b.d / 2 + (b.d * i) / nz;
        pts.push(
          [b.x + b.w / 2, top, z, 0.85 + rand() * 0.3],
          [b.x - b.w / 2, top, z, 0.85 + rand() * 0.3],
        );
      }
    }
    const coneGeo = new ConeGeometry(0.42, 0.9, 4, 1);
    coneGeo.rotateY(Math.PI / 4);
    coneGeo.translate(0, 0.45, 0);
    const shurfa = new InstancedMesh(coneGeo, wallMat, pts.length);
    for (let i = 0; i < pts.length; i++) {
      if (i % 400 === 0 && this.overBudget()) await this.pause();
      const [x, y, z, s] = pts[i]!;
      m.compose(new Vector3(x, y, z), q, new Vector3(1, s, 1));
      shurfa.setMatrixAt(i, m);
      shurfa.setColorAt(i, palette[i % palette.length]!.clone().multiplyScalar(0.95));
    }
    this.scene.add(shurfa);
    this.disposables.push(coneGeo, shurfa);

    // ---- windows: Najdi triangles on the street-facing and camera-facing walls ----
    const tri = new Shape();
    tri.moveTo(-0.22, 0);
    tri.lineTo(0.22, 0);
    tri.lineTo(0, 0.66);
    tri.closePath();
    const triGeo = new ShapeGeometry(tri);
    const wins: Array<{ m: Matrix4; th: number; ph: number }> = [];
    const stepWin = this.quality === 'high' ? 1 : 2;
    const o = new Object3D();
    for (const b of boxes) {
      if (this.overBudget()) await this.pause();
      if (!b.tower) continue;
      const bRand = rand();
      const rows = Math.floor((b.h - 4.5) / 2.5);
      const faces: Array<{ nx: number; nz: number; len: number }> = [
        { nx: 0, nz: 1, len: b.w }, // faces camera
        { nx: b.x > 0 ? -1 : 1, nz: 0, len: b.d }, // faces the street
      ];
      for (const f of faces) {
        const cols = Math.max(1, Math.floor(f.len / 1.9));
        for (let r = 0; r < rows; r += stepWin) {
          for (let c = 0; c < cols; c++) {
            if (rand() < 0.12) continue; // plaster gaps
            const u = (c + 0.5) / cols - 0.5;
            const y = 2.2 + r * 2.5 + 0.2;
            if (f.nz === 1) o.position.set(b.x + u * b.w * 0.86, y, b.z + b.d / 2 + 0.03);
            else o.position.set(b.x + f.nx * (b.w / 2 + 0.03), y, b.z + u * b.d * 0.86);
            o.rotation.set(0, f.nz === 1 ? 0 : f.nx === -1 ? -Math.PI / 2 : Math.PI / 2, 0);
            o.scale.setScalar(0.85 + rand() * 0.3);
            o.updateMatrix();
            wins.push({
              m: o.matrix.clone(),
              th: Math.min(1, bRand * 0.45 + rand() * 0.7),
              ph: rand(),
            });
          }
        }
      }
    }
    const makeWindowMaterial = (halo: boolean) => {
      const mat = new ShaderMaterial({
        transparent: halo,
        depthWrite: !halo,
        ...(halo ? { blending: AdditiveBlending } : {}),
        polygonOffset: !halo,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        uniforms: {
          uTime: { value: 0 },
          uLit: { value: 0.1 },
          uPointer: { value: new Vector2(10, 10) },
          uAspect: { value: 1 },
          uFogDensity: { value: this.fog.density },
          uFogColor: { value: raw('#5a2d1a') },
          uOn: { value: raw('#e8995f') },
          uOff: { value: raw('#120a07') },
        },
        defines: halo ? { HALO: '' } : {},
        vertexShader: /* glsl */ `
          uniform float uTime, uLit, uAspect, uFogDensity;
          uniform vec2 uPointer;
          attribute float aThreshold;
          attribute float aPhase;
          varying float vGlow;
          varying float vFog;
          void main() {
            #ifdef HALO
              vec3 lp = (position - vec3(0.0, 0.22, 0.0)) * 2.7 + vec3(0.0, 0.22, 0.0);
            #else
              vec3 lp = position;
            #endif
            vec4 mv = viewMatrix * instanceMatrix * vec4(lp, 1.0);
            vec4 clip = projectionMatrix * mv;
            vec2 ndc = clip.xy / clip.w;
            float near = smoothstep(0.34, 0.0, distance(ndc * vec2(uAspect, 1.0), uPointer * vec2(uAspect, 1.0)));
            float lit = smoothstep(aThreshold - 0.05, aThreshold, uLit + near * 0.6);
            vGlow = lit * (0.9 + 0.1 * sin(uTime * 1.6 + aPhase * 6.2831));
            float depth = -mv.z;
            vFog = 1.0 - exp(-pow(uFogDensity * depth, 2.0));
            gl_Position = clip;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uOn, uOff, uFogColor;
          varying float vGlow;
          varying float vFog;
          void main() {
            #ifdef HALO
              gl_FragColor = vec4(uOn, vGlow * 0.16 * (1.0 - vFog));
            #else
              vec3 col = mix(uOff, uOn * 1.08, vGlow);
              col = mix(col, uFogColor, vFog);
              gl_FragColor = vec4(col, 1.0);
            #endif
          }`,
      });
      this.windows.push(mat);
      return mat;
    };
    const winMat = makeWindowMaterial(false);
    const winMesh = new InstancedMesh(triGeo, winMat, wins.length);
    const thr = new Float32Array(wins.length);
    const pha = new Float32Array(wins.length);
    wins.forEach((w, i) => {
      winMesh.setMatrixAt(i, w.m);
      thr[i] = w.th;
      pha[i] = w.ph;
    });
    triGeo.setAttribute('aThreshold', new InstancedBufferAttribute(thr, 1));
    triGeo.setAttribute('aPhase', new InstancedBufferAttribute(pha, 1));
    winMesh.frustumCulled = false;
    this.scene.add(winMesh);
    this.disposables.push(triGeo, winMat, winMesh);
    await this.pause();

    if (this.quality === 'high') {
      const haloMat = makeWindowMaterial(true);
      this.halo = new InstancedMesh(triGeo, haloMat, wins.length);
      wins.forEach((w, i) => this.halo!.setMatrixAt(i, w.m));
      this.halo.frustumCulled = false;
      this.halo.renderOrder = 5;
      this.scene.add(this.halo);
      this.disposables.push(haloMat, this.halo);
    } else {
      this.halo = null;
    }

    // ---- ground + street ----
    const groundGeo = new PlaneGeometry(2600, 2600);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new MeshStandardMaterial({ color: '#100b08', roughness: 1 });
    const ground = new Mesh(groundGeo, groundMat);
    ground.position.y = -0.02;
    this.scene.add(ground);
    const streetGeo = new PlaneGeometry(15, 280, 1, 28);
    streetGeo.rotateX(-Math.PI / 2);
    const pos = streetGeo.attributes.position!;
    const cols: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const t = MathUtils.clamp((-z - 20) / 200, 0, 1); // brighter toward the sun
      const c = new Color('#1b110c').lerp(new Color('#7a3d22'), Math.pow(t, 2.2));
      cols.push(c.r, c.g, c.b);
    }
    streetGeo.setAttribute('color', new Float32BufferAttribute(cols, 3));
    const streetMat = new MeshBasicMaterial({ vertexColors: true });
    const street = new Mesh(streetGeo, streetMat);
    street.position.set(0, 0.01, -110);
    this.scene.add(street);
    // sunset reflected on the dusty ground softens the horizon line
    const gc = document.createElement('canvas');
    gc.width = gc.height = 256;
    const g2 = gc.getContext('2d')!;
    const grad = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,176,120,1)');
    grad.addColorStop(0.3, 'rgba(255,140,84,0.4)');
    grad.addColorStop(1, 'rgba(255,120,60,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 256, 256);
    const glowTex = new CanvasTexture(gc);
    glowTex.colorSpace = SRGBColorSpace;
    const glowGeo = new PlaneGeometry(560, 560);
    glowGeo.rotateX(-Math.PI / 2);
    this.groundGlow = new MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const glow = new Mesh(glowGeo, this.groundGlow);
    glow.position.set(0, 0.06, -290);
    this.scene.add(glow);
    await this.pause();
    this.disposables.push(
      groundGeo,
      groundMat,
      streetGeo,
      streetMat,
      glowGeo,
      this.groundGlow,
      glowTex,
    );

    // ---- embers ----
    if (this.quality === 'high') {
      const N = 420;
      const g = new BufferGeometry();
      const p = new Float32Array(N * 3);
      const s = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        p[i * 3] = (rand() - 0.5) * 70;
        p[i * 3 + 1] = rand() * 46;
        p[i * 3 + 2] = 20 - rand() * 200;
        s[i] = rand();
      }
      g.setAttribute('position', new Float32BufferAttribute(p, 3));
      g.setAttribute('aSeed', new Float32BufferAttribute(s, 1));
      this.emberMat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: 300 },
          uFogDensity: { value: this.fog.density },
          uColor: { value: raw('#e8995f') },
        },
        vertexShader: /* glsl */ `
          uniform float uTime, uScale, uFogDensity;
          attribute float aSeed;
          varying float vA;
          void main() {
            vec3 p = position;
            p.y = mod(p.y + uTime * (0.7 + aSeed * 1.6), 46.0);
            p.x += sin(uTime * 0.4 + aSeed * 40.0) * 1.4;
            p.z += cos(uTime * 0.3 + aSeed * 22.0) * 1.2;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            float depth = -mv.z;
            gl_PointSize = min((1.2 + aSeed * 2.2) * uScale / max(depth, 1.0), 16.0);
            float fogF = exp(-pow(uFogDensity * depth, 2.0));
            vA = fogF * (0.35 + 0.65 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 20.0) * 0.5 + 0.325) * smoothstep(46.0, 30.0, p.y);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vA * 0.7;
            gl_FragColor = vec4(uColor, a);
          }`,
      });
      this.embers = new Points(g, this.emberMat);
      this.embers.frustumCulled = false;
      this.scene.add(this.embers);
      this.disposables.push(g, this.emberMat);
    } else {
      this.embers = null;
      this.emberMat = null;
    }

    await this.pause();
    this.camPath = new CatmullRomCurve3(
      KEYS.map(([p]) => p.clone()),
      false,
      'centripetal',
    );
    this.lookPath = new CatmullRomCurve3(
      KEYS.map(([, l]) => l.clone()),
      false,
      'centripetal',
    );
    this.applyPalette(0);
    this.placeCamera(0, 0, 0);
    await this.pause();
    // compile shaders without blocking where the browser supports parallel compilation
    const r = this.renderer as WebGLRenderer & {
      compileAsync?: (s: Scene, c: PerspectiveCamera) => Promise<unknown>;
    };
    if (r.compileAsync) await r.compileAsync(this.scene, this.camera);
  }

  // ---------- public API ----------
  setScrollProgress(p: number) {
    this.target = MathUtils.clamp(p, 0, 1);
  }
  setPointer(x: number, y: number) {
    this.pointer.set(MathUtils.clamp(x, -1, 1), MathUtils.clamp(y, -1, 1));
  }
  /** Shifts the hero framing so the sun sits opposite the headline (+1 for RTL, -1 for LTR). */
  setBias(dir: number) {
    this.bias = dir;
  }
  setMode(mode: SceneMode) {
    this.mode = mode;
  }
  resize(w: number, h: number, dpr: number) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.renderer.setPixelRatio(Math.min(dpr, this.dprCap));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    // Portrait screens need a wider field of view to keep the street in frame.
    this.camera.fov = this.camera.aspect < 0.8 ? 58 : 42;
    this.camera.updateProjectionMatrix();
    this.windows.forEach((w2) => (w2.uniforms.uAspect!.value = this.camera.aspect));
    if (this.emberMat)
      this.emberMat.uniforms.uScale!.value = this.height * 0.45 * Math.min(dpr, this.dprCap);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    this.lastT = this.t0;
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  /** One still frame (used for reduced-motion users). */
  renderStill(progress = 0) {
    this.progress = progress;
    this.target = progress;
    this.applyPalette(progress);
    this.placeCamera(progress, 6, 0);
    this.windows.forEach((w) => (w.uniforms.uLit!.value = this.litFor(progress)));
    this.renderer.render(this.scene, this.camera);
    this.markFirst();
  }
  dispose() {
    this.stop();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ---------- internals ----------
  private litFor(p: number) {
    return MathUtils.lerp(0.1, 0.96, MathUtils.smoothstep(p, 0.02, 0.95));
  }
  private markFirst() {
    if (this.firstDone) return;
    this.firstDone = true;
    this.onFirstFrame?.();
  }

  private applyPalette(p: number) {
    const night = MathUtils.smoothstep(p, 0.5, 1);
    const u = this.sky.material.uniforms;
    u.uTop!.value.copy(mix(SKY.top[0]!, SKY.top[1]!, night));
    u.uMid!.value.copy(mix(SKY.mid[0]!, SKY.mid[1]!, night));
    u.uHorizon!.value.copy(mix(SKY.horizon[0]!, SKY.horizon[1]!, night));
    u.uNight!.value = night;
    const fogRaw = mix(SKY.fog[0]!, SKY.fog[1]!, night);
    // standard materials fog in linear space; the custom shaders output raw sRGB values
    this.fog.color.copy(fogRaw).convertSRGBToLinear();
    const fc = this.fog.color;
    this.windows.forEach((w) => w.uniforms.uFogColor!.value.copy(fogRaw));
    this.sun.intensity = 2.3 * (1 - night * 0.55);
    this.groundGlow.opacity = 0.5 * (1 - night * 0.45);
    this.renderer.setClearColor(fc);
  }

  private placeCamera(p: number, t: number, intro: number) {
    const k = MathUtils.clamp(p, 0, 1);
    const pos = this.camPath.getPoint(k);
    const look = this.lookPath.getPoint(k);
    const calm = this.mode === 'ambient' ? 0.55 : 1;
    pos.x += Math.sin(t * 0.11) * 0.9 * calm + this.pointerS.x * 1.5 * calm;
    pos.y += Math.sin(t * 0.14) * 0.35 * calm + this.pointerS.y * 0.7 * calm + intro * 3.2;
    pos.z += intro * 12;
    look.x += this.pointerS.x * 5 * calm + this.bias * 13 * (1 - MathUtils.smoothstep(k, 0, 0.22));
    look.y += this.pointerS.y * 2.2 * calm;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.sky.position.copy(pos);
  }

  private frame(now: number) {
    const dt = Math.min((now - this.lastT) / 1000, 0.1);
    this.lastT = now;
    const t = (now - this.t0) / 1000;

    // adaptive quality: drop pixel ratio, then give up and let the page show its poster
    this.frames++;
    // Software renderers (CI, headless) are always slow; tests set this flag to keep the scene on.
    const noDegrade = (globalThis as { __RK_NO_DEGRADE?: boolean }).__RK_NO_DEGRADE === true;
    if (this.frames > 30 && !noDegrade) {
      if (dt > 0.034) this.slow++;
      else this.slow = Math.max(0, this.slow - 1);
      if (this.slow > 90) {
        this.slow = 0;
        if (this.dprCap > 1) {
          this.dprCap = 1;
          this.resize(this.width, this.height, 1);
        } else {
          this.stop();
          this.onDegrade?.();
          return;
        }
      }
    }

    const wantP = this.mode === 'story' ? this.target : 0.06;
    this.progress += (wantP - this.progress) * Math.min(1, dt * 3.2);
    this.pointerS.lerp(this.pointer, Math.min(1, dt * 4));
    const intro = Math.pow(1 - MathUtils.smoothstep(t, 0, 3.2), 2);

    this.applyPalette(this.progress);
    this.placeCamera(this.progress, t, intro);

    const lit = this.litFor(this.progress);
    for (const w of this.windows) {
      w.uniforms.uTime!.value = t;
      w.uniforms.uLit!.value = lit;
      w.uniforms.uPointer!.value.copy(this.pointerS);
    }
    if (this.emberMat) this.emberMat.uniforms.uTime!.value = t;

    this.renderer.render(this.scene, this.camera);
    this.markFirst();
  }
}
