import type { MepKind, MepSymbol } from '@rasikh/shared';

/** One drawing symbol per kind, drawn in metres on the plan and scaled up for the legend. */
const BLUE = '#1d4e89';
const TEAL = '#0f766e';
const RED = '#A63D32';
const GREEN = '#2f7d4f';

export const SYMBOL_GROUPS = {
  electrical: ['light', 'socket', 'db'],
  mechanical: ['ac', 'riser', 'wc', 'basin', 'shower', 'sink', 'tap'],
  safety: ['smoke', 'callpoint', 'extinguisher', 'exitsign'],
} as const satisfies Record<string, readonly MepKind[]>;

export function Glyph({ kind, label }: { kind: MepKind; label?: string }) {
  const w = 0.04;
  switch (kind) {
    case 'light':
      return (
        <g stroke={BLUE} strokeWidth={w} fill="#fffdf9">
          <circle r={0.2} />
          <path d="M -0.14 -0.14 L 0.14 0.14 M 0.14 -0.14 L -0.14 0.14" />
        </g>
      );
    case 'socket':
      return (
        <g stroke={BLUE} strokeWidth={w}>
          <circle r={0.13} fill={BLUE} />
          <path d="M -0.2 0.2 L 0.2 0.2" />
        </g>
      );
    case 'db':
      return (
        <g>
          <rect x={-0.28} y={-0.28} width={0.56} height={0.56} fill={BLUE} />
          <text y={0.1} fontSize={0.26} textAnchor="middle" fill="#fff">
            {label ?? 'DB'}
          </text>
        </g>
      );
    case 'ac':
      return (
        <g>
          <rect
            x={-0.5}
            y={-0.2}
            width={1}
            height={0.4}
            fill="#cde7e4"
            stroke={TEAL}
            strokeWidth={w}
          />
          <text y={0.09} fontSize={0.26} textAnchor="middle" fill={TEAL}>
            {label}
          </text>
        </g>
      );
    case 'riser':
      return (
        <g stroke={TEAL} strokeWidth={w} fill="#fffdf9">
          <circle r={0.26} />
          <circle r={0.12} fill={TEAL} />
          {label && (
            <text x={0.34} y={-0.3} fontSize={0.26} stroke="none" fill={TEAL}>
              {label}
            </text>
          )}
        </g>
      );
    case 'wc':
      return <ellipse rx={0.17} ry={0.25} fill="#fffdf9" stroke={TEAL} strokeWidth={w} />;
    case 'basin':
      return (
        <rect
          x={-0.17}
          y={-0.12}
          width={0.34}
          height={0.24}
          rx={0.08}
          fill="#fffdf9"
          stroke={TEAL}
          strokeWidth={w}
        />
      );
    case 'shower':
      return (
        <g stroke={TEAL} strokeWidth={w} fill="#fffdf9">
          <rect x={-0.22} y={-0.22} width={0.44} height={0.44} />
          <path d="M -0.22 -0.22 L 0.22 0.22 M 0.22 -0.22 L -0.22 0.22" />
        </g>
      );
    case 'sink':
      return (
        <g stroke={TEAL} strokeWidth={w} fill="#fffdf9">
          <rect x={-0.22} y={-0.14} width={0.44} height={0.28} />
          <circle r={0.07} />
        </g>
      );
    case 'tap':
      return <circle r={0.1} fill={TEAL} />;
    case 'smoke':
      return (
        <g stroke={RED} strokeWidth={w} fill="#fffdf9">
          <circle r={0.2} />
          <text y={0.09} fontSize={0.26} textAnchor="middle" stroke="none" fill={RED}>
            S
          </text>
        </g>
      );
    case 'callpoint':
      return (
        <g>
          <rect x={-0.16} y={-0.16} width={0.32} height={0.32} fill={RED} />
          <text y={0.08} fontSize={0.24} textAnchor="middle" fill="#fff">
            M
          </text>
        </g>
      );
    case 'extinguisher':
      return (
        <g>
          <circle r={0.2} fill={RED} />
          <text y={0.09} fontSize={0.26} textAnchor="middle" fill="#fff">
            F
          </text>
        </g>
      );
    case 'exitsign':
      return (
        <g>
          <rect x={-0.32} y={-0.13} width={0.64} height={0.26} fill={GREEN} />
          <text y={0.07} fontSize={0.2} textAnchor="middle" fill="#fff">
            EXIT
          </text>
        </g>
      );
  }
}

/** The symbols of one floor, placed on the plan (y flipped by `Y`). */
export function MepLayer({
  symbols,
  floor,
  Y,
  kinds,
}: {
  symbols: readonly MepSymbol[];
  floor: number;
  Y: (y: number) => number;
  kinds?: readonly MepKind[];
}) {
  return (
    <g data-testid="mep-layer">
      {symbols
        .filter((s) => s.floor === floor && (!kinds || kinds.includes(s.kind)))
        .map((s) => (
          <g key={s.id} data-symbol={s.kind} transform={`translate(${s.x} ${Y(s.y)})`}>
            <Glyph kind={s.kind} {...(s.label ? { label: s.label } : {})} />
          </g>
        ))}
    </g>
  );
}

/** A legend of the symbols a sheet uses, with how many are on the floor. */
export function SymbolLegend({
  kinds,
  counts,
  name,
  title,
  countLabel,
}: {
  kinds: readonly MepKind[];
  counts: Partial<Record<MepKind, number>>;
  name: (k: MepKind) => string;
  title: string;
  countLabel: string;
}) {
  const used = kinds.filter((k) => (counts[k] ?? 0) > 0);
  return (
    <table className="text-caption" data-testid="symbol-legend">
      <caption className="mb-1 text-start font-semibold">{title}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{title}</th>
          <th scope="col">{countLabel}</th>
        </tr>
      </thead>
      <tbody>
        {used.map((k) => (
          <tr key={k}>
            <td className="pe-2">
              <svg viewBox="-0.6 -0.4 1.2 0.8" width={34} height={22} aria-hidden="true">
                <Glyph kind={k} label={k === 'ac' ? 'TR' : k === 'riser' ? 'S1' : undefined} />
              </svg>
            </td>
            <td className="pe-3">{name(k)}</td>
            <td className="tabular text-end">{counts[k]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
