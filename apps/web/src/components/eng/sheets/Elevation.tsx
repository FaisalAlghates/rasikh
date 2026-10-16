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

/** The four looks: Najdi crenellation, modern clad volume, Swiss pitched roof and timber, palace dome and columns. */
type Look = 'najdi' | 'modern' | 'swiss' | 'palace';
const lookOf = (style: Program['style']): Look =>
  style === 'modern_najdi' || style === 'salmani'
    ? 'najdi'
    : style === 'swiss'
      ? 'swiss'
      : style === 'palace' || style === 'classic'
        ? 'palace'
        : 'modern';

const WALL: Record<Look, string> = {
  najdi: '#efe1cc',
  modern: '#e6e3dc',
  swiss: '#f3efe8',
  palace: '#eadfc8',
};

/**
 * A façade as seen from one side: each floor's own silhouette (a floor set back, a roof annex, a guest pavilion),
 * its roof edge where nothing is built above, floor lines, and the openings on the walls facing that way that
 * nothing in front hides. The look follows the style: Najdi crenellation; a modern clad upper volume with framed
 * glazing and a plain coping; a Swiss pitched roof with timber cladding, shuttered windows and balconies; a palace's
 * arched windows, corner pilasters, cornices, a portico at the entrance and a central dome. Axis bubbles on top and
 * level marks on the right, as on a consultant's sheet.
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
  const look = lookOf(style);
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
  const top = look === 'swiss' || look === 'palace' ? 4.2 : 2.2; // room above for roofs and axis bubbles
  const Y = (z: number) => height - z;
  const wall = WALL[look];
  const topFloor = plan.floors - 1;
  const rise = (w: number) => Math.min(2.8, w * 0.28);
  // the highest, widest roof gets the palace dome
  const topRoofs = minus(extent(topFloor), []);
  const domeAt = topRoofs.sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
  return (
    <svg
      viewBox={`${-M} ${-top} ${width + M + R} ${height + top + 1.6}`}
      role="img"
      aria-label={title}
      className="h-auto w-full"
      style={{ direction: 'ltr' }}
      data-look={look}
    >
      <defs>
        <pattern id={`slat-${uid}`} width={1} height={0.22} patternUnits="userSpaceOnUse">
          <rect width={1} height={0.22} fill="#52585e" />
          <path d="M 0 0.2 H 1" stroke="#2c3035" strokeWidth={0.05} />
        </pattern>
        <pattern id={`wood-${uid}`} width={0.28} height={1} patternUnits="userSpaceOnUse">
          <rect width={0.28} height={1} fill="#b98a58" />
          <path d="M 0.28 0 V 1" stroke="#7d5a36" strokeWidth={0.03} />
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
                  fill={
                    look === 'modern' && f === topFloor
                      ? `url(#slat-${uid})`
                      : look === 'swiss' && f > 0
                        ? `url(#wood-${uid})`
                        : wall
                  }
                  stroke="#1A1815"
                  strokeWidth={0.06}
                />
                {look === 'modern' && f === 0 && (
                  <rect
                    x={a}
                    y={Y(0.9)}
                    width={b - a}
                    height={0.9}
                    fill="#8f8a80"
                    fillOpacity={0.35}
                  />
                )}
                {look === 'swiss' && f === 0 && (
                  <rect
                    x={a}
                    y={Y(0.7)}
                    width={b - a}
                    height={0.7}
                    fill="#8f8a80"
                    fillOpacity={0.5}
                  />
                )}
                {look === 'palace' && (
                  <>
                    {[a, b - 0.4].map((x) => (
                      <rect
                        key={x}
                        x={x}
                        y={Y((f + 1) * fh)}
                        width={0.4}
                        height={fh}
                        fill="#d8c9a9"
                        stroke="#1A1815"
                        strokeWidth={0.03}
                      />
                    ))}
                    <rect
                      x={a}
                      y={Y(f * fh + 0.3)}
                      width={b - a}
                      height={0.3}
                      fill="#d8c9a9"
                      stroke="#1A1815"
                      strokeWidth={0.03}
                    />
                  </>
                )}
              </g>
            ))}
            {roof.map(([a, b]) => (
              <g key={`p${a}`}>
                {look === 'najdi' && (
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
                )}
                {look === 'modern' && (
                  <>
                    <rect
                      x={a - 0.55}
                      y={Y((f + 1) * fh + 0.38)}
                      width={b - a + 1.1}
                      height={0.38}
                      fill="#fbfaf7"
                      stroke="#1A1815"
                      strokeWidth={0.05}
                    />
                    <rect
                      x={a - 0.55}
                      y={Y((f + 1) * fh)}
                      width={b - a + 1.1}
                      height={0.08}
                      fill="#2c3035"
                    />
                  </>
                )}
                {look === 'swiss' && (
                  <>
                    <path
                      d={`M ${a - 0.6} ${Y((f + 1) * fh)} L ${(a + b) / 2} ${Y((f + 1) * fh + rise(b - a + 1.2))} L ${b + 0.6} ${Y((f + 1) * fh)} Z`}
                      fill="#6b4a36"
                      stroke="#1A1815"
                      strokeWidth={0.06}
                    />
                    <path
                      d={`M ${a - 0.6} ${Y((f + 1) * fh)} H ${b + 0.6}`}
                      stroke="#3f2b1f"
                      strokeWidth={0.14}
                    />
                    <path
                      d={`M ${(a + b) / 2 - 0.5} ${Y((f + 1) * fh + rise(b - a + 1.2) * 0.45)} h 1 v 0.6 h -1 z`}
                      fill="#cfe0ec"
                      stroke="#3f2b1f"
                      strokeWidth={0.05}
                    />
                  </>
                )}
                {look === 'palace' && (
                  <>
                    <rect
                      x={a - 0.15}
                      y={Y((f + 1) * fh + 0.4)}
                      width={b - a + 0.3}
                      height={0.4}
                      fill="#d8c9a9"
                      stroke="#1A1815"
                      strokeWidth={0.04}
                    />
                    {Array.from({ length: Math.max(0, Math.floor((b - a) / 0.5)) }, (_, i) => (
                      <rect
                        key={i}
                        x={a + 0.1 + i * 0.5}
                        y={Y((f + 1) * fh + 1.1)}
                        width={0.18}
                        height={0.7}
                        fill="#e9dcc3"
                        stroke="#1A1815"
                        strokeWidth={0.02}
                      />
                    ))}
                    <rect
                      x={a}
                      y={Y((f + 1) * fh + 1.2)}
                      width={b - a}
                      height={0.12}
                      fill="#d8c9a9"
                    />
                  </>
                )}
              </g>
            ))}
          </g>
        );
      })}
      {look === 'palace' && domeAt && (
        <g data-testid="dome">
          {(() => {
            const cx = (domeAt[0] + domeAt[1]) / 2;
            const r = Math.max(0.9, Math.min(2.4, (domeAt[1] - domeAt[0]) * 0.28));
            const base = Y(plan.floors * fh + 1.35);
            return (
              <>
                <rect
                  x={cx - r * 1.15}
                  y={base - 0.9}
                  width={r * 2.3}
                  height={0.9}
                  fill="#d8c9a9"
                  stroke="#1A1815"
                  strokeWidth={0.05}
                />
                <path
                  d={`M ${cx - r} ${base - 0.9} A ${r} ${r} 0 0 1 ${cx + r} ${base - 0.9} Z`}
                  fill="#b7c4c7"
                  stroke="#1A1815"
                  strokeWidth={0.06}
                />
                <line
                  x1={cx}
                  x2={cx}
                  y1={base - 0.9 - r}
                  y2={base - 0.9 - r - 0.7}
                  stroke="#1A1815"
                  strokeWidth={0.08}
                />
              </>
            );
          })()}
        </g>
      )}
      {ops.map((o) => {
        const [a, b] = across
          ? span(Math.min(o.x1, o.x2), Math.max(o.x1, o.x2))
          : span(Math.min(o.y1, o.y2), Math.max(o.y1, o.y2));
        const y = Y(o.floor * fh + 0.25 + o.head);
        const h = o.head - o.sill;
        const win = o.kind === 'window';
        const arch = look === 'palace' && b - a > 0.7;
        const r = (b - a) / 2;
        const fill = win
          ? look === 'najdi'
            ? '#cfe0ec'
            : look === 'modern'
              ? '#b4d0dc'
              : '#9fc0d2'
          : '#8C6A4E';
        const stroke =
          look === 'najdi'
            ? '#1A1815'
            : look === 'swiss'
              ? '#5a3d28'
              : look === 'modern'
                ? '#23303a'
                : '#2b3a42';
        return (
          <g key={o.id}>
            {arch ? (
              <path
                d={`M ${a} ${y + h} L ${a} ${y + r} A ${r} ${r} 0 0 1 ${b} ${y + r} L ${b} ${y + h} Z`}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.08}
              />
            ) : (
              <rect
                x={a}
                y={y}
                width={b - a}
                height={h}
                fill={fill}
                stroke={stroke}
                strokeWidth={look === 'najdi' ? 0.04 : 0.08}
              />
            )}
            {look !== 'najdi' && win && b - a > 1.3 && !arch && (
              <line
                x1={(a + b) / 2}
                x2={(a + b) / 2}
                y1={y}
                y2={y + h}
                stroke={stroke}
                strokeWidth={0.05}
              />
            )}
            {look === 'modern' && o.kind === 'entry' && (
              <rect x={a - 0.6} y={y - 0.35} width={b - a + 1.2} height={0.2} fill="#2c3035" />
            )}
            {look === 'swiss' && win && (
              <>
                {[a - 0.4, b + 0.05].map((x) => (
                  <rect
                    key={x}
                    x={x}
                    y={y}
                    width={0.35}
                    height={h}
                    fill="#5d7a4a"
                    stroke="#3f4f33"
                    strokeWidth={0.03}
                  />
                ))}
                {o.floor > 0 && b - a > 1.2 && (
                  <>
                    <rect x={a - 0.4} y={y + h} width={b - a + 0.8} height={0.14} fill="#6b4a36" />
                    <path
                      d={`M ${a - 0.4} ${y + h} v -0.9 M ${b + 0.4} ${y + h} v -0.9 M ${a - 0.4} ${y + h - 0.9} H ${b + 0.4}`}
                      stroke="#3f2b1f"
                      strokeWidth={0.05}
                      fill="none"
                    />
                  </>
                )}
              </>
            )}
            {o.kind === 'entry' && look === 'palace' && (
              <g data-testid="portico">
                {[a - 0.9, a - 0.2, b + 0.2, b + 0.9].map((x) => (
                  <rect
                    key={x}
                    x={x - 0.15}
                    y={y - 0.2}
                    width={0.3}
                    height={h + 0.2}
                    fill="#eadfc8"
                    stroke="#1A1815"
                    strokeWidth={0.03}
                  />
                ))}
                <rect
                  x={a - 1.2}
                  y={y - 0.5}
                  width={b - a + 2.4}
                  height={0.3}
                  fill="#d8c9a9"
                  stroke="#1A1815"
                  strokeWidth={0.04}
                />
                <path
                  d={`M ${a - 1.2} ${y - 0.5} L ${(a + b) / 2} ${y - 1.4} L ${b + 1.2} ${y - 0.5} Z`}
                  fill="#eadfc8"
                  stroke="#1A1815"
                  strokeWidth={0.04}
                />
              </g>
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
