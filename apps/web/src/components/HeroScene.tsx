/**
 * Static dusk scene used until the live 3D map arrives in Phase 3.
 * Original artwork (no stock photos): Najdi mud-brick towers with shurfa crenellations
 * against a quiet clay-lit horizon. Inline SVG keeps LCP fast.
 */
const K = 0.8; // keeps towers below the headline zone
const W = 1600;
const H = 900;
const GROUND = 850;

function Shurfa({ x, y, w, fill }: { x: number; y: number; w: number; fill: string }) {
  const n = Math.max(1, Math.floor(w / 20));
  const step = w / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={`M${x + i * step} ${y}l${step / 2} -${step * 0.7}l${step / 2} ${step * 0.7}z`}
          fill={fill}
        />
      ))}
    </>
  );
}

interface Block {
  x: number;
  w: number;
  h: number;
  windows?: Array<[number, number]>;
}

const far: Block[] = [
  { x: 40, w: 70, h: 210 },
  { x: 150, w: 56, h: 300 },
  { x: 250, w: 90, h: 180 },
  { x: 420, w: 60, h: 360 },
  { x: 540, w: 100, h: 230 },
  { x: 700, w: 64, h: 280 },
  { x: 1000, w: 80, h: 250 },
  { x: 1130, w: 58, h: 340 },
  { x: 1240, w: 96, h: 200 },
  { x: 1400, w: 70, h: 300 },
  { x: 1500, w: 70, h: 190 },
];

const near: Block[] = [
  {
    x: -20,
    w: 210,
    h: 250,
    windows: [
      [40, 70],
      [110, 70],
      [40, 140],
      [110, 140],
    ],
  },
  {
    x: 230,
    w: 160,
    h: 330,
    windows: [
      [40, 60],
      [100, 60],
      [40, 130],
      [100, 130],
      [40, 200],
      [100, 200],
    ],
  },
  {
    x: 430,
    w: 130,
    h: 200,
    windows: [
      [30, 60],
      [80, 60],
      [30, 120],
    ],
  },
  {
    x: 1020,
    w: 150,
    h: 290,
    windows: [
      [35, 60],
      [90, 60],
      [35, 130],
      [90, 130],
      [35, 200],
    ],
  },
  {
    x: 1210,
    w: 200,
    h: 220,
    windows: [
      [40, 60],
      [110, 60],
      [40, 130],
      [110, 130],
    ],
  },
  {
    x: 1450,
    w: 190,
    h: 340,
    windows: [
      [40, 60],
      [105, 60],
      [40, 130],
      [105, 130],
      [40, 200],
      [105, 200],
    ],
  },
];

export function HeroScene({
  className,
  crop = 'hero',
}: {
  className?: string;
  crop?: 'hero' | 'arch';
}) {
  return (
    <svg
      viewBox={crop === 'arch' ? '170 260 480 640' : `0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="dusk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E0D0B" />
          <stop offset="0.62" stopColor="#1F1511" />
          <stop offset="1" stopColor="#5A2C1B" />
        </linearGradient>
        <radialGradient id="dusk-glow" cx="0.62" cy="0.86" r="0.5">
          <stop offset="0" stopColor="#D9825A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#D9825A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#dusk-sky)" />
      <rect width={W} height={H} fill="url(#dusk-glow)" />

      {/* far skyline */}
      <g fill="#2A1A14">
        {far.map((b) => (
          <rect key={b.x} x={b.x} y={GROUND - b.h * K} width={b.w} height={b.h * K} />
        ))}
      </g>

      {/* near Najdi towers with shurfa tops */}
      {near.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={GROUND - b.h * K} width={b.w} height={b.h * K} fill="#150F0C" />
          <Shurfa x={b.x} y={GROUND - b.h * K} w={b.w} fill="#150F0C" />
          {b.windows?.map(([wx, wy]) => (
            <path
              key={`${wx}-${wy}`}
              d={`M${b.x + wx} ${GROUND - b.h * K + wy + 22}l7 -18l7 18z`}
              fill="#D9825A"
              opacity="0.75"
            />
          ))}
        </g>
      ))}

      <rect y={GROUND} width={W} height={H - GROUND} fill="#0E0D0B" />
    </svg>
  );
}
