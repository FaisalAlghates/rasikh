import { floorName, type DesignPlan } from '@rasikh/shared';
import { useTranslations } from 'next-intl';

/** The vertical levels of the building: street, each floor's finished level, the roof and the parapet top. */
export function LevelsBody({ plan, lang }: { plan: DesignPlan; lang: 'ar' | 'en' }) {
  const t = useTranslations('eng.set.levels');
  const fh = plan.floorHeight;
  const total = plan.floors * fh;
  const S = 14; // px per metre
  const H = (total + 3) * S;
  const Y = (z: number) => H - 1.5 * S - z * S;
  const W = 520;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('title')}
      className="h-auto w-full max-w-3xl"
      style={{ direction: 'ltr' }}
      data-testid="levels"
    >
      <rect width={W} height={H} fill="#fffdf9" />
      <line x1={20} x2={W - 20} y1={Y(0)} y2={Y(0)} stroke="#1A1815" strokeWidth={2} />
      <text x={W - 20} y={Y(0) + 16} fontSize={11} textAnchor="end" fill="#6A6358">
        {t('street')} ±0.00
      </text>
      {Array.from({ length: plan.floors }, (_, f) => {
        const z = f * fh;
        return (
          <g key={f}>
            <rect
              x={150}
              y={Y(z + fh)}
              width={150}
              height={fh * S}
              fill="#efe1cc"
              stroke="#1A1815"
              strokeWidth={1}
            />
            <rect x={150} y={Y(z + 0.25)} width={150} height={0.25 * S} fill="#1A1815" />
            <line
              x1={150}
              x2={300}
              y1={Y(z + 0.25 + plan.clearHeight)}
              y2={Y(z + 0.25 + plan.clearHeight)}
              stroke="#8C8478"
              strokeDasharray="4 3"
            />
            <text x={225} y={Y(z + fh / 2) + 4} fontSize={12} textAnchor="middle" fill="#1A1815">
              {floorName(f)[lang]}
            </text>
            <line x1={300} x2={420} y1={Y(z)} y2={Y(z)} stroke="#6A6358" />
            <path d={`M 420 ${Y(z)} l -6 -8 h 12 z`} fill="#1A1815" />
            <text x={430} y={Y(z) + 4} fontSize={12} fill="#1A1815">
              {z === 0 ? '±0.00' : `+${z.toFixed(2)}`}
            </text>
            <line x1={130} x2={130} y1={Y(z)} y2={Y(z + fh)} stroke="#1A1815" />
            <text
              x={122}
              y={Y(z + fh / 2)}
              fontSize={11}
              textAnchor="middle"
              transform={`rotate(-90 122 ${Y(z + fh / 2)})`}
              fill="#1A1815"
            >
              {fh.toFixed(2)}
            </text>
          </g>
        );
      })}
      <rect x={150} y={Y(total + 1)} width={150} height={S} fill="#e6d3b8" stroke="#1A1815" />
      <line x1={300} x2={420} y1={Y(total)} y2={Y(total)} stroke="#6A6358" />
      <path d={`M 420 ${Y(total)} l -6 -8 h 12 z`} fill="#1A1815" />
      <text x={430} y={Y(total) + 4} fontSize={12} fill="#1A1815">
        +{total.toFixed(2)} {t('roof')}
      </text>
      <text x={430} y={Y(total + 1) + 4} fontSize={11} fill="#6A6358">
        +{(total + 1).toFixed(2)} {t('parapet')}
      </text>
      <text x={150} y={H - 6} fontSize={11} fill="#6A6358">
        {t('clear')}: {plan.clearHeight.toFixed(2)} m
      </text>
    </svg>
  );
}
