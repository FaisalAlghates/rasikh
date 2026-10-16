import type { DesignPlan } from '@rasikh/shared';

type T = (key: string, values?: Record<string, string | number>) => string;

/** A floor's name: the ground floor, the roof annex on top, or "floor n". */
export function floorLabel(t: T, plan: Pick<DesignPlan, 'floors' | 'annex'>, f: number): string {
  if (f === 0) return t('ground');
  if (plan.annex && f === plan.floors - 1) return t('annexFloor');
  return t('floorN', { n: f });
}
