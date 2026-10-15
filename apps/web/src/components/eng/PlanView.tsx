'use client';

import {
  openingsOf,
  type Clash,
  type DesignPlan,
  type Piece,
  type PlanRoom,
  type StructuralScheme,
} from '@rasikh/shared';
import { useMemo, type KeyboardEvent } from 'react';

/** Fill per room family (the Najd Dusk palette, quiet). */
const FILL: Record<string, string> = {
  public: '#efe3d0',
  service: '#e7ddcf',
  private: '#f4ece0',
  wet: '#dfe7e5',
  core: '#d8cfc2',
  circulation: '#faf6ef',
};
const family = (t: PlanRoom['type']) =>
  t === 'majlis_men' || t === 'majlis_women' || t === 'dining' || t === 'entrance' || t === 'shop'
    ? 'public'
    : t === 'kitchen' ||
        t === 'maid_room' ||
        t === 'driver_room' ||
        t === 'laundry' ||
        t === 'storage'
      ? 'service'
      : t === 'bathroom' || t === 'guest_wc'
        ? 'wet'
        : t === 'stair' || t === 'elevator'
          ? 'core'
          : t === 'corridor'
            ? 'circulation'
            : 'private';

const STATE_STROKE = { existing: '#4a433b', demolish: '#A63D32', new: '#4F7A5A' } as const;

export interface PlanViewProps {
  plan: DesignPlan;
  floor: number;
  label: (r: PlanRoom) => string;
  /** Rooms to outline (e.g. failed checks). */
  highlight?: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Draft watermark text, or null once released. */
  watermark?: string | null;
  scheme?: StructuralScheme;
  clashes?: Clash[];
  furniture?: Piece[];
  northDeg?: number;
  /** Accessible name of the drawing. */
  title: string;
  streetLabel?: string;
  compact?: boolean;
}

/**
 * One floor of a plan as SVG, in metres (the street at the bottom). The same geometry as the 3D model and the exports.
 */
export function PlanView(p: PlanViewProps) {
  const { plan, floor } = p;
  const M = 2.4; // margin for dimensions
  const W = plan.plot.width;
  const D = plan.plot.depth;
  const Y = (y: number) => D - y; // street (y = 0) at the bottom
  const rooms = plan.rooms.filter((r) => r.floor === floor);
  const ops = useMemo(() => openingsOf(plan).filter((o) => o.floor === floor), [plan, floor]);
  const fp = plan.footprint;
  const env = plan.envelope;
  const fs = p.compact ? 0.55 : 0.42;

  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onSelect?.(id);
    }
  };

  return (
    <svg
      viewBox={`${-M} ${-M} ${W + 2 * M} ${D + 2 * M + 1.2}`}
      role={p.onSelect ? 'group' : 'img'}
      aria-label={p.title}
      className="h-auto w-full select-none"
      style={{ direction: 'ltr' }}
    >
      <rect x={-M} y={-M} width={W + 2 * M} height={D + 2 * M + 1.2} fill="#fffdf9" />
      {/* plot, street and setbacks */}
      <rect
        x={0}
        y={0}
        width={W}
        height={D}
        fill="none"
        stroke="#8C8478"
        strokeWidth={0.06}
        strokeDasharray="0.4 0.25"
      />
      <rect x={-M + 0.2} y={D + 0.15} width={W + 2 * M - 0.4} height={M - 0.3} fill="#e9e3d9" />
      {p.streetLabel && (
        <text x={W / 2} y={D + M / 2 + 0.15} fontSize={0.5} textAnchor="middle" fill="#6A6358">
          {p.streetLabel}
        </text>
      )}
      <rect
        x={env.x}
        y={Y(env.y + env.h)}
        width={env.w}
        height={env.h}
        fill="none"
        stroke="#B5532C"
        strokeOpacity={0.5}
        strokeWidth={0.05}
        strokeDasharray="0.15 0.15"
      />

      {/* rooms */}
      {rooms.map((r) => {
        const sel = r.id === p.selectedId;
        const bad = p.highlight?.includes(r.id);
        const state = r.state ? STATE_STROKE[r.state] : undefined;
        const area = (r.w * r.h).toFixed(1);
        return (
          <g
            key={r.id}
            data-room={r.id}
            role={p.onSelect ? 'button' : undefined}
            tabIndex={p.onSelect ? 0 : undefined}
            aria-label={p.onSelect ? `${p.label(r)} ${area}` : undefined}
            aria-pressed={p.onSelect ? sel : undefined}
            onClick={p.onSelect ? () => p.onSelect?.(r.id) : undefined}
            onKeyDown={p.onSelect ? key(r.id) : undefined}
            className={
              p.onSelect
                ? 'cursor-pointer outline-none focus-visible:[&>rect]:stroke-[#9C4522]'
                : undefined
            }
          >
            <rect
              x={r.x}
              y={Y(r.y + r.h)}
              width={r.w}
              height={r.h}
              fill={r.state === 'demolish' ? '#f6e3e0' : FILL[family(r.type)]}
              stroke={state ?? (sel ? '#B5532C' : bad ? '#A63D32' : '#1A1815')}
              strokeWidth={sel || bad ? 0.14 : 0.1}
              strokeDasharray={r.state === 'demolish' ? '0.3 0.15' : undefined}
            />
            {r.type === 'stair' &&
              Array.from({ length: Math.floor(r.h / 0.3) }, (_, i) => (
                <line
                  key={i}
                  x1={r.x}
                  x2={r.x + r.w}
                  y1={Y(r.y + 0.3 * (i + 1))}
                  y2={Y(r.y + 0.3 * (i + 1))}
                  stroke="#8C8478"
                  strokeWidth={0.02}
                />
              ))}
            {r.w > 1.6 && r.h > 1.2 && (
              <>
                <text
                  x={r.x + r.w / 2}
                  y={Y(r.y + r.h / 2) - 0.05}
                  fontSize={Math.min(fs, r.w / 6)}
                  textAnchor="middle"
                  fill="#1A1815"
                  style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}
                >
                  {p.label(r)}
                </text>
                <text
                  x={r.x + r.w / 2}
                  y={Y(r.y + r.h / 2) + fs * 0.95}
                  fontSize={fs * 0.72}
                  textAnchor="middle"
                  fill="#6A6358"
                >
                  {area} m²
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* doors (a gap with a swing) and windows (a double line) */}
      {ops.map((o) =>
        o.kind === 'window' ? (
          <g key={o.id}>
            <line
              x1={o.x1}
              y1={Y(o.y1)}
              x2={o.x2}
              y2={Y(o.y2)}
              stroke="#fffdf9"
              strokeWidth={0.16}
            />
            <line
              x1={o.x1}
              y1={Y(o.y1)}
              x2={o.x2}
              y2={Y(o.y2)}
              stroke="#3b6ea5"
              strokeWidth={0.05}
            />
          </g>
        ) : (
          <g key={o.id}>
            <line
              x1={o.x1}
              y1={Y(o.y1)}
              x2={o.x2}
              y2={Y(o.y2)}
              stroke="#fffdf9"
              strokeWidth={0.16}
            />
            <path
              d={`M ${o.x1} ${Y(o.y1)} A ${Math.hypot(o.x2 - o.x1, o.y2 - o.y1)} ${Math.hypot(o.x2 - o.x1, o.y2 - o.y1)} 0 0 1 ${o.x2} ${Y(o.y2)}`}
              fill="none"
              stroke={o.kind === 'entry' ? '#B5532C' : '#8C8478'}
              strokeWidth={0.03}
            />
          </g>
        ),
      )}

      {/* furniture layer (never exported, never checked) */}
      {p.furniture
        ?.filter((f) => f.floor === floor)
        .map((f) => (
          <rect
            key={f.id}
            x={f.x}
            y={Y(f.y + f.d)}
            width={f.w}
            height={f.d}
            fill="#c8b7a2"
            fillOpacity={0.55}
            stroke="#8C8478"
            strokeWidth={0.02}
          />
        ))}

      {/* structural grid and columns */}
      {p.scheme && (
        <g>
          {p.scheme.gridX.map((x, i) => (
            <g key={`gx${i}`}>
              <line
                x1={x}
                x2={x}
                y1={Y(fp.y + fp.h) - 0.6}
                y2={Y(fp.y) + 0.6}
                stroke="#B5532C"
                strokeWidth={0.03}
                strokeDasharray="0.4 0.2"
              />
              <text
                x={x}
                y={Y(fp.y + fp.h) - 0.8}
                fontSize={0.4}
                textAnchor="middle"
                fill="#B5532C"
              >
                {i + 1}
              </text>
            </g>
          ))}
          {p.scheme.gridY.map((y, i) => (
            <g key={`gy${i}`}>
              <line
                x1={fp.x - 0.6}
                x2={fp.x + fp.w + 0.6}
                y1={Y(y)}
                y2={Y(y)}
                stroke="#B5532C"
                strokeWidth={0.03}
                strokeDasharray="0.4 0.2"
              />
              <text
                x={fp.x - 0.9}
                y={Y(y) + 0.15}
                fontSize={0.4}
                textAnchor="middle"
                fill="#B5532C"
              >
                {String.fromCharCode(65 + i)}
              </text>
            </g>
          ))}
          {p.scheme.columns.map((c, i) => (
            <rect
              key={i}
              x={c.x - 0.15}
              y={Y(c.y) - 0.15}
              width={0.3}
              height={0.3}
              fill="#1A1815"
            />
          ))}
        </g>
      )}
      {p.clashes
        ?.filter((c) => c.floor === floor)
        .map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={Y(c.y)}
            r={0.5}
            fill="#A63D32"
            fillOpacity={0.35}
            stroke="#A63D32"
            strokeWidth={0.06}
          />
        ))}

      {/* overall dimensions of the footprint */}
      <g stroke="#1A1815" strokeWidth={0.03} fill="#1A1815">
        <line x1={fp.x} x2={fp.x + fp.w} y1={Y(fp.y) + 0.9} y2={Y(fp.y) + 0.9} />
        <line x1={fp.x} x2={fp.x} y1={Y(fp.y) + 0.7} y2={Y(fp.y) + 1.1} />
        <line x1={fp.x + fp.w} x2={fp.x + fp.w} y1={Y(fp.y) + 0.7} y2={Y(fp.y) + 1.1} />
        <text
          x={fp.x + fp.w / 2}
          y={Y(fp.y) + 0.8}
          fontSize={0.4}
          textAnchor="middle"
          stroke="none"
        >
          {fp.w.toFixed(2)}
        </text>
        <line x1={fp.x + fp.w + 0.9} x2={fp.x + fp.w + 0.9} y1={Y(fp.y)} y2={Y(fp.y + fp.h)} />
        <text
          x={fp.x + fp.w + 1.35}
          y={Y(fp.y + fp.h / 2)}
          fontSize={0.4}
          textAnchor="middle"
          stroke="none"
          transform={`rotate(-90 ${fp.x + fp.w + 1.35} ${Y(fp.y + fp.h / 2)})`}
        >
          {fp.h.toFixed(2)}
        </text>
      </g>

      {/* north arrow */}
      <g transform={`translate(${W + M / 2} ${-M / 2 + 0.9}) rotate(${p.northDeg ?? 0})`}>
        <path d="M 0 -0.8 L 0.35 0.4 L 0 0.15 L -0.35 0.4 Z" fill="#1A1815" />
        <text y={-0.95} fontSize={0.45} textAnchor="middle" fill="#1A1815">
          N
        </text>
      </g>

      {p.watermark && (
        <text
          x={W / 2}
          y={D / 2}
          fontSize={Math.max(0.9, W / 18)}
          textAnchor="middle"
          fill="#A63D32"
          fillOpacity={0.16}
          transform={`rotate(-28 ${W / 2} ${D / 2})`}
          style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}
          data-testid="draft-watermark"
        >
          {p.watermark}
        </text>
      )}
    </svg>
  );
}
