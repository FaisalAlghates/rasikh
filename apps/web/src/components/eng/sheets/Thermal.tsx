import { BUILDUPS, layerR, uValue, type Layer } from '@rasikh/shared';
import { useLocale, useTranslations } from 'next-intl';

const FILL: Record<string, string> = {
  plaster: '#e9ddc8',
  block: '#cfc4b3',
  pu: '#f1e6a8',
  slab: '#b9b2a8',
  lwc: '#d6d0c5',
  bitumen: '#4a433b',
  sand: '#e8d9ae',
  cement: '#d9d3c8',
  tile: '#c9a27e',
};

/** A cut through the layers, outside on the left; the width of each is its real thickness (scaled up to read). */
function LayerSection({ layers, label }: { layers: readonly Layer[]; label: string }) {
  const t = useTranslations('eng.set.thermal');
  const scale = 190 / layers.reduce((s, l) => s + l.t, 0);
  let x = 20;
  return (
    <svg
      viewBox="0 0 230 120"
      role="img"
      aria-label={label}
      className="h-auto w-full"
      style={{ direction: 'ltr' }}
    >
      <text x={4} y={14} fontSize={9} fill="#6A6358">
        {t('out')}
      </text>
      <text x={226} y={14} fontSize={9} textAnchor="end" fill="#6A6358">
        {t('in')}
      </text>
      {layers.map((l, i) => {
        const w = l.t * scale;
        const rect = (
          <g key={`${l.id}${i}`}>
            <rect
              x={x}
              y={24}
              width={w}
              height={74}
              fill={FILL[l.id] ?? '#ddd'}
              stroke="#1A1815"
              strokeWidth={0.8}
            />
            {l.id === 'block' && (
              <path
                d={`M ${x} 98 L ${x + w} 24 M ${x} 61 L ${x + w} 24 M ${x + w} 98 L ${x} 61`}
                stroke="#6A6358"
                strokeWidth={0.4}
              />
            )}
            {l.id === 'slab' && (
              <path
                d={Array.from(
                  { length: 6 },
                  (_, k) => `M ${x} ${30 + k * 12} L ${x + w} ${24 + k * 12}`,
                ).join(' ')}
                stroke="#6A6358"
                strokeWidth={0.4}
              />
            )}
            <text x={x + w / 2} y={112} fontSize={8} textAnchor="middle" fill="#1A1815">
              {i + 1}
            </text>
          </g>
        );
        x += w;
        return rect;
      })}
    </svg>
  );
}

function Table({ layers, title }: { layers: readonly Layer[]; title: string }) {
  const t = useTranslations('eng.set.thermal');
  const locale = useLocale();
  const total = uValue(layers);
  return (
    <figure className="flex flex-col gap-2" data-testid="thermal-buildup">
      <figcaption className="text-small font-semibold">{title}</figcaption>
      <LayerSection layers={layers} label={title} />
      <table className="w-full text-[0.68rem]">
        <thead>
          <tr className="border-b border-night/40 text-start">
            <th scope="col" className="p-1 text-start">
              {t('layer')}
            </th>
            <th scope="col" className="p-1 text-end">
              {t('thickness')}
            </th>
            <th scope="col" className="p-1 text-end">
              {t('k')}
            </th>
            <th scope="col" className="p-1 text-end">
              {t('r')}
            </th>
          </tr>
        </thead>
        <tbody>
          {layers.map((l, i) => (
            <tr key={`${l.id}${i}`} className="border-b border-night/10">
              <td className="p-1">
                {i + 1}. {locale === 'ar' ? l.ar : l.en}
              </td>
              <td className="tabular p-1 text-end">{l.t.toFixed(3)}</td>
              <td className="tabular p-1 text-end">{l.k}</td>
              <td className="tabular p-1 text-end">{layerR(l).toFixed(3)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="p-1">{t('total')}</td>
            <td className="tabular p-1 text-end">{total.thickness.toFixed(3)}</td>
            <td />
            <td className="tabular p-1 text-end">{total.r.toFixed(3)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-small" data-testid="u-value">
        {t('u')}: <strong className="tabular">{total.u.toFixed(3)}</strong>
      </p>
    </figure>
  );
}

/** The thermal insulation sheet: the wall and roof build-ups with their layer tables and U-values. */
export function ThermalBody() {
  const t = useTranslations('eng.set.thermal');
  const locale = useLocale();
  const name = (k: keyof typeof BUILDUPS) => (locale === 'ar' ? BUILDUPS[k].ar : BUILDUPS[k].en);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-3">
        <Table layers={BUILDUPS.wall.layers} title={name('wall')} />
        <Table layers={BUILDUPS.wallWet.layers} title={name('wallWet')} />
        <Table layers={BUILDUPS.roof.layers} title={name('roof')} />
      </div>
      <p dir="auto" className="max-w-3xl text-caption text-warning" data-testid="thermal-note">
        {t('note')}
      </p>
    </div>
  );
}
