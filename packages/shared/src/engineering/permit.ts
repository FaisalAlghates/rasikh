/**
 * Balady building-permit readiness. Rasikh shows what is ready and what is missing; it never submits to Balady —
 * the licensed office does, under its own credentials.
 */
export const PERMIT_ITEMS = [
  'deed',
  'cadastral_report',
  'design_contract',
  'supervision_contract',
  'contractor_contract',
  'latent_defects_insurance',
  'soil_report',
  'traffic_study',
  'approved_drawings',
] as const;
export type PermitItem = (typeof PERMIT_ITEMS)[number];
export type PermitState = 'ready' | 'missing' | 'not_required';

/** Items that may not apply to every project (e.g. a traffic study only for larger or commercial buildings). */
export const OPTIONAL_PERMIT_ITEMS: readonly PermitItem[] = [
  'traffic_study',
  'latent_defects_insurance',
];

export function permitReadiness(state: Partial<Record<PermitItem, PermitState>>) {
  const rows = PERMIT_ITEMS.map((item) => ({
    item,
    state: state[item] ?? (OPTIONAL_PERMIT_ITEMS.includes(item) ? 'not_required' : 'missing'),
  }));
  const missing = rows.filter((r) => r.state === 'missing').map((r) => r.item);
  return { rows, missing, ready: missing.length === 0 };
}
