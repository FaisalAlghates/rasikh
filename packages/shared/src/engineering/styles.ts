import type { DesignPlan, Program } from './schemas.js';

/**
 * The four design languages Rasikh offers, and how each one shapes an option beyond its façade: which design types
 * suit it (a courtyard house for Najdi, a roof terrace for modern, a compact block for Swiss, a symmetrical house
 * around a hall or a guest pavilion for a palace). The fit only ranks options that already pass every check; it never
 * lets a design break the plot, the zoning or the code.
 */
export const DESIGN_STYLES = ['modern_najdi', 'contemporary', 'swiss', 'palace'] as const;
export type DesignStyle = (typeof DESIGN_STYLES)[number];

type Style = NonNullable<Program['style']>;
type Kind = 'bands' | 'court' | 'sidecourt' | 'terrace' | 'pavilion';

export interface StyleTraits {
  /** 0–1 per design type: how naturally the style takes it. */
  typology: Partial<Record<Kind, number>>;
  /** A symmetrical, centred composition (entrance and core in the middle). */
  symmetric: boolean;
  /** The roof form drawn on the façade and the model. */
  roof: 'crenellated' | 'flat' | 'pitched' | 'dome';
  /** Typical window width (m): narrow Najdi slits, wide modern glazing, a Swiss chalet's paired windows. */
  windowW: number;
}

export const STYLE_TRAITS: Record<Style, StyleTraits> = {
  modern_najdi: {
    typology: { court: 1, sidecourt: 0.8, pavilion: 0.4, bands: 0.25, terrace: 0 },
    symmetric: false,
    roof: 'crenellated',
    windowW: 1.2,
  },
  salmani: {
    typology: { court: 0.9, sidecourt: 0.8, pavilion: 0.5, bands: 0.3, terrace: 0.1 },
    symmetric: true,
    roof: 'crenellated',
    windowW: 1.4,
  },
  contemporary: {
    typology: { terrace: 1, bands: 0.6, pavilion: 0.6, sidecourt: 0.4, court: 0.3 },
    symmetric: false,
    roof: 'flat',
    windowW: 2.2,
  },
  classic: {
    typology: { bands: 0.8, court: 0.6, sidecourt: 0.5, pavilion: 0.4, terrace: 0.1 },
    symmetric: true,
    roof: 'flat',
    windowW: 1.4,
  },
  swiss: {
    typology: { bands: 1, pavilion: 0.5, sidecourt: 0.3, terrace: 0.3, court: 0.1 },
    symmetric: false,
    roof: 'pitched',
    windowW: 1.7,
  },
  palace: {
    typology: { court: 1, pavilion: 0.8, bands: 0.5, sidecourt: 0.4, terrace: 0.1 },
    symmetric: true,
    roof: 'dome',
    windowW: 1.4,
  },
};

/** 0–1: how well an option's layout suits the style it is drawn in. */
export function styleFit(plan: DesignPlan, style: Style | undefined): number {
  const t = STYLE_TRAITS[style ?? 'contemporary'];
  const v = plan.variant;
  let s = t.typology[(v.typology ?? 'bands') as Kind] ?? 0.3;
  if (t.symmetric) {
    const centred = (v.entry === 'middle' ? 0.5 : 0) + (v.core === 'center' ? 0.5 : 0);
    s = s * 0.7 + centred * 0.3;
  }
  // a Swiss house is a compact block: the narrower the footprint against the plot, the better
  if (style === 'swiss') s = s * 0.8 + (1 - Math.min(1, Number(v.widthShare ?? 1))) * 0.2 + 0.1;
  return Math.max(0, Math.min(1, s));
}
