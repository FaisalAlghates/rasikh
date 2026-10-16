import { DRAWING_TYPE, TITLE_BLOCK, type SheetSpec } from '@rasikh/shared';
import type { ReactNode } from 'react';

export interface FrameInfo {
  officeName: string;
  projectTitle: string;
  date: string;
  versionLabel: string;
  sha256: string;
  released: boolean;
  approvals: string[];
  northDeg: number;
  /** Notes printed in the title strip. */
  notes: string[];
  watermark: string;
  approvalRecord: string;
}

function Row({
  label,
  children,
  strong,
}: {
  label: { ar: string; en: string };
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="border-b border-night/60 px-2 py-1">
      <p className="flex justify-between gap-2 text-[0.62rem] leading-tight text-[#5f594f]">
        <span dir="rtl">{label.ar}</span>
        <span>{label.en}</span>
      </p>
      <div className={strong ? 'text-small font-semibold' : 'text-caption'}>{children}</div>
    </div>
  );
}

/**
 * A sheet the way a consultant's office issues it: a framed drawing area and, in a column at its right, the north
 * arrow, notes, the area kept for the office's stamp, and the title block with Arabic and English labels. It never
 * draws a stamp: the stamp is the office's, after a licensed engineer approves.
 */
export function SheetFrame({
  spec,
  info,
  children,
}: {
  spec: SheetSpec;
  info: FrameInfo;
  children: ReactNode;
}) {
  const type = DRAWING_TYPE[spec.group];
  return (
    <section
      className="eng-sheet flex flex-col rounded-lg border-2 border-night bg-[#fffdf9] text-night"
      aria-labelledby={`sh-${spec.id}`}
      data-testid={`sheet-${spec.id}`}
      data-code={spec.code}
    >
      <div dir="ltr" className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="relative flex flex-col border-night p-2 md:border-e-2">
          <div className="relative flex-1">{children}</div>
          <p
            id={`sh-${spec.id}`}
            className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 text-center text-small font-semibold"
          >
            <span dir="rtl">{spec.ar}</span>
            <span>{spec.en}</span>
            <span className="text-caption font-normal text-[#5f594f]">{spec.scale}</span>
          </p>
        </div>
        <aside className="flex flex-col border-t-2 border-night md:border-t-0">
          <div className="flex items-center justify-center border-b border-night/60 p-2">
            <svg viewBox="-1 -1.4 2 2.6" width={44} height={56} aria-label="N" role="img">
              <g transform={`rotate(${info.northDeg})`}>
                <path d="M 0 -0.95 L 0.38 0.55 L 0 0.25 L -0.38 0.55 Z" fill="#1A1815" />
              </g>
              <text y={-1.1} fontSize={0.5} textAnchor="middle" fill="#1A1815">
                N
              </text>
            </svg>
          </div>
          <div className="border-b border-night/60 px-2 py-1">
            <p className="flex justify-between text-[0.62rem] text-[#5f594f]">
              <span dir="rtl">{TITLE_BLOCK.notes.ar}</span>
              <span>{TITLE_BLOCK.notes.en}</span>
            </p>
            <ol dir="auto" className="list-decimal ps-4 text-[0.66rem] leading-snug">
              {info.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
          </div>
          <div
            className="m-2 flex min-h-16 items-center justify-center border border-dashed border-night/50 p-1 text-center text-[0.6rem] text-[#5f594f]"
            data-testid="stamp-area"
          >
            {TITLE_BLOCK.stamp.ar} · {TITLE_BLOCK.stamp.en}
          </div>
          <div className="mt-auto border-t-2 border-night">
            <Row label={TITLE_BLOCK.office}>{info.officeName}</Row>
            <Row label={TITLE_BLOCK.project}>{info.projectTitle}</Row>
            <Row label={TITLE_BLOCK.type}>
              <span dir="rtl">{type.ar}</span> · {type.en}
            </Row>
            <Row label={TITLE_BLOCK.title} strong>
              <span dir="rtl">{spec.ar}</span>
              <br />
              {spec.en}
            </Row>
            <Row label={TITLE_BLOCK.sheet} strong>
              <span data-testid="sheet-code">{spec.code}</span>
            </Row>
            <div className="grid grid-cols-2">
              <div className="border-e border-night/60">
                <Row label={TITLE_BLOCK.scale}>{spec.scale}</Row>
              </div>
              <Row label={TITLE_BLOCK.date}>{info.date}</Row>
            </div>
            <Row label={TITLE_BLOCK.version}>
              <span dir="ltr">
                {info.versionLabel} · {info.sha256.slice(0, 12)}
              </span>
            </Row>
            <p
              className={`px-2 py-1 text-[0.66rem] leading-snug ${
                info.released ? 'text-success' : 'font-semibold text-danger'
              }`}
            >
              {info.released
                ? `${info.approvals.join(' · ')} — ${info.approvalRecord}`
                : info.watermark}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
