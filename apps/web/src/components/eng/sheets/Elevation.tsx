import {
  floorName,
  isOpen,
  openingsOf,
  structuralScheme,
  type DesignPlan,
  type PlanRoom,
  type Program,
} from '@rasikh/shared';
import { useId } from 'react';
import { merge, minus, type Span } from './spans';

export type Side = 'front' | 'back' | 'left' | 'right';

/**
 * A façade as seen from one side: each floor's own silhouette (a floor set back, a roof annex, a guest pavilion),
 * its roof edge where nothing is built above (the Najdi crenellation for Najdi styles, a plain coping for modern
 * ones), floor lines, and the openings on the walls facing that way that nothing in front hides. Modern styles get
 * a clad upper volume, framed glazing and fins. Axis bubbles on top and level marks on the right, as on a consultant's
 * sheet.
 */
export function Elevation({
  plan,
  side,
  style,
  title,
  lang,
}: {
  plan: DesignPlan;
  side: Side;
  style: Program['style'];
  title: string;
  lang: 'ar' | 'en';
}) {
  const uid = useId().replace(/:/g, '');
  const fp = plan.footprint;
  const across = side === 'front' || side === 'back';
  const width = across ? fp.w : fp.h;
  const fh = plan.floorHeight;
  const height = plan.floors * fh + 1;
  // position along the façade as seen from outside (the viewer's left first)
  const pos = (u: number) => {
    const a = across ? u - fp.x : u - fp.y;
    return side === 'back' || side === 'left' ? width - a : a;
  };
  const span = (u0: number, u1: number): Span => {
    const a = pos(u0);
    const b = pos(u1);
    return [Math.min(a, b), Math.max(a, b)];
  };
  const built = (f: number) => plan.rooms.filter((r) => r.floor === f && !isOpen(r.type));
  const extent = (f: number) =>
    merge(built(f).map((r) => (across ? span(r.x, r.x + r.w) : span(r.y, r.y + r.h))));
  // how close to the viewer a room's facing side is (bigger is nearer)
  const near = (r: PlanRoom) =>
    side === 'front' ? -r.y : side === 'back' ? r.y + r.h : side === 'left' ? -r.x : r.x + r.w;
  const ops = openingsOf(plan).filter((o) => {
    const r = plan.rooms.find((x) => x.id === o.roomId);
    if (!r) return false;
    const eps = 0.05;
    const onSide =
      side === 'front'
        ? Math.abs(o.y1 - r.y) < eps && Math.abs(o.y2 - r.y) < eps
        : side === 'back'
          ? Math.abs(o.y1 - (r.y + r.h)) < eps && Math.abs(o.y2 - (r.y + r.h)) < eps
          : side === 'left'
            ? Math.abs(o.x1 - r.x) < eps && Math.abs(o.x2 - r.x) < eps
            : Math.abs(o.x1 - (r.x + r.w)) < eps && Math.abs(o.x2 - (r.x + r.w)) < eps;
    if (!onSide) return false;
    // hidden when a built room on the same floor stands in front of it
    const [a, b] = across
      ? span(Math.min(o.x1, o.x2), Math.max(o.x1, o.x2))
      : span(Math.min(o.y1, o.y2), Math.max(o.y1, o.y2));
    return !built(o.floor).some((x) => {
      if (x.id === r.id || near(x) <= near(r) + 0.05) return false;
      const [xa, xb] = across ? span(x.x, x.x + x.w) : span(x.y, x.y + x.h);
      return xa < b - 0.05 && xb > a + 0.05;
    });
  });
  const scheme = structuralScheme(plan);
  const axes = (across ? scheme.gridX : scheme.gridY).map((u, i) => ({
    at: pos(u),
    mark: String(i + 1).padStart(2, '0'),
  }));
  const R = 5; // room on the right for the level marks
  const M = 1.5;
  const top = 2.2; // room above for the axis bubbles
  const najdi = style === 'modern_najdi' || style === 'salmani';
  const Y = (z: number) => height - z;
  const wall = najdi ? '#efe1cc' : '#e6e3dc';
  const topFloor = plan.floors - 1;
  return (
    <svg
      viewBox={`${-M} ${-top} ${width + M + R} ${height + top + 1.6}`}
      role="img"
      aria-label={title}
      className="h-auto w-full"
      style={{ direction: 'ltr' }}
    >
      <defs>
        <pattern id={`brick-${uid}`} width={0.9} height={0.4} patternUnits="userSpaceOnUse">
          <rect width={0.9} height={0.4} fill="#b88a6a" />
          <path
            d="M 0 0.2 H 0.9 M 0.45 0 V 0.2 M 0 0.2 V 0.4 M 0.9 0.2 V 0.4"
            stroke="#8a6248"
            strokeWidth={0.03}
          />
        </pattern>
      </defs>
      <rect x={-M} y={-top} width={width + M + R} height={height + top + 1.6} fill="#fffdf9" />
      {/* axis bubbles */}
      {axes.map((a) => (
        <g key={a.mark}>
          <line
            x1={a.at}
            x2={a.at}
            y1={-1.1}
            y2={0.4}
            stroke="#6A6358"
            strokeWidth={0.03}
            strokeDasharray="0.3 0.15"
          />
          <circle cx={a.at} cy={-1.5} r={0.45} fill="#fffdf9" stroke="#1A1815" strokeWidth={0.04} />
          <text x={a.at} y={-1.35} fontSize={0.4} textAnchor="middle" fill="#1A1815">
            {a.mark}
          </text>
        </g>
      ))}
      <line x1={-M} x2={width + M} y1={height} y2={height} stroke="#1A1815" strokeWidth={0.1} />
      {Array.from({ length: plan.floors }, (_, f) => {
        const mine = extent(f);
        const roof = minus(mine, f + 1 < plan.floors ? extent(f + 1) : []);
        return (
          <g key={f}>
            {mine.map(([a, b]) => (
              <g key={`w${a}`}>
                <rect
                  x={a}
                  y={Y((f + 1) * fh)}
                  width={b - a}
                  height={fh}
                  fill={!najdi && f === topFloor ? `url(#brick-${uid})` : wall}
                  stroke="#1A1815"
                  strokeWidth={0.06}
                />
                {!najdi && f === 0 && (
                  <rect
                    x={a}
                    y={Y(0.9)}
                    width={b - a}
                    height={0.9}
                    fill="#8f8a80"
                    fillOpacity={0.35}
                  />
                )}
              </g>
            ))}
            {roof.map(([a, b]) => (
              <g key={`p${a}`}>
                {najdi ? (
                  <>
                    <rect
                      x={a}
                      y={Y((f + 1) * fh + 1)}
                      width={b - a}
                      height={1}
                      fill="#e6d3b8"
                      stroke="#1A1815"
                      strokeWidth={0.05}
                    />
                    {Array.from({ length: Math.floor((b - a) / 0.8) }, (_, i) => (
                      <path
                        key={i}
                        d={`M ${a + i * 0.8 + 0.1} ${Y((f + 1) * fh + 1)} L ${a + i * 0.8 + 0.4} ${Y((f + 1) * fh + 1.5)} L ${a + i * 0.8 + 0.7} ${Y((f + 1) * fh + 1)} Z`}
                        fill="#c9a27e"
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <rect
                      x={a - 0.1}
                      y={Y((f + 1) * fh + 0.45)}
                      width={b - a + 0.2}
                      height={0.45}
                      fill="#4a4741"
                      stroke="#1A1815"
                      strokeWidth={0.04}
                    />
                    <rect
                      x={a}
                      y={Y((f + 1) * fh + 0.95)}
                      width={b - a}
                      height={0.5}
                      fill={wall}
                      stroke="#1A1815"
                      strokeWidth={0.04}
                    />
                  </>
                )}
              </g>
            ))}
          </g>
        );
      })}
      {ops.map((o) => {
        const [a, b] = across
          ? span(Math.min(o.x1, o.x2), Math.max(o.x1, o.x2))
          : span(Math.min(o.y1, o.y2), Math.max(o.y1, o.y2));
        const y = Y(o.floor * fh + 0.25 + o.head);
        const h = o.head - o.sill;
        const win = o.kind === 'window';
        return (
          <g key={o.id}>
            <rect
              x={a}
              y={y}
              width={b - a}
              height={h}
              fill={win ? (najdi ? '#cfe0ec' : '#9fc0d2') : '#8C6A4E'}
              stroke={najdi ? '#1A1815' : '#2b3a42'}
              strokeWidth={najdi ? 0.04 : 0.08}
            />
            {!najdi && win && b - a > 1.3 && (
              <line
                x1={(a + b) / 2}
                x2={(a + b) / 2}
                y1={y}
                y2={y + h}
                stroke="#2b3a42"
                strokeWidth={0.05}
              />
            )}
            {!najdi && win && (
              <rect x={a - 0.08} y={y - 0.06} width={b - a + 0.16} height={0.08} fill="#4a4741" />
            )}
          </g>
        );
      })}
      {/* level marks */}
      {Array.from({ length: plan.floors + 1 }, (_, f) => {
        const z = f * fh;
        const label = f === plan.floors ? (lang === 'ar' ? 'السطح' : 'ROOF') : floorName(f)[lang];
        return (
          <g key={`lv${f}`}>
            <line
              x1={width + 0.3}
              x2={width + R - 0.6}
              y1={Y(z)}
              y2={Y(z)}
              stroke="#6A6358"
              strokeWidth={0.04}
            />
            <path d={`M ${width + 0.3} ${Y(z)} l 0.3 -0.3 h -0.6 z`} fill="#1A1815" />
            <text x={width + 0.9} y={Y(z) - 0.15} fontSize={0.42} fill="#1A1815">
              {z === 0 ? '±0.00' : `+${z.toFixed(2)}`}
            </text>
            <text x={width + 0.9} y={Y(z) + 0.5} fontSize={0.36} fill="#6A6358">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
