import { z } from 'zod';
import { variantCode, type Variant } from './layout.js';
import {
  BUILDING_TYPES,
  DesignPlanSchema,
  STYLES,
  type DesignPlan,
  type Program,
} from './schemas.js';

/**
 * The design library the engine learns from: released designs of engineering offices on Rasikh, shared only with the
 * client's consent and the office's, without any personal data (no client name, no exact location), credited to the
 * office. An entry keeps the design's pattern (its design type and how its rooms are arranged) and, when the office
 * chose to share it, the whole plan. Nothing is collected from outside Rasikh: other offices' drawings are their work
 * and their clients' property.
 *
 * The engine re-lays each matching pattern on the new plot (it never copies a plan), checks it like any other option,
 * and says which office's project inspired it; how often offices choose an arrangement nudges the ranking.
 */

/** The arrangement of a design: the layout engine's knobs, enough to re-lay it on any plot. */
export const PatternSchema = z.object({
  typology: z.enum(['bands', 'court', 'sidecourt', 'terrace', 'pavilion']),
  core: z.enum(['left', 'center', 'right']),
  front: z.number().min(0.2).max(0.8),
  widthShare: z.number().min(0.5).max(1),
  slack: z.number().min(0).max(0.6),
  site: z.enum(['front', 'back']),
  align: z.enum(['left', 'center', 'right']),
  mirror: z.boolean(),
  entry: z.enum(['side', 'middle']),
  dining: z.enum(['front', 'back']),
  master: z.enum(['front', 'back']),
});
export type Pattern = z.infer<typeof PatternSchema>;

export const LibraryEntrySchema = z.object({
  /** The office credited for the design. */
  officeId: z.string().min(1).max(128),
  officeName: z.string().trim().min(2).max(100),
  /** A generic title (never the client's name). */
  title: z.string().trim().min(3).max(120),
  city: z.string().trim().max(40).default(''),
  type: z.enum(BUILDING_TYPES),
  style: z.enum(STYLES),
  floors: z.number().int().min(1).max(30),
  bedrooms: z.number().int().min(0).max(30),
  plot: z.object({ width: z.number().min(6).max(200), depth: z.number().min(6).max(200) }),
  builtUpM2: z.number().min(0).max(100000),
  pattern: PatternSchema,
  /** 'pattern': the arrangement only; 'plan': the office also shares the plan itself. */
  share: z.enum(['pattern', 'plan']),
  plan: DesignPlanSchema.optional(),
});
export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;
export type LibraryItem = LibraryEntry & { id: string };

/** The pattern of a plan the engine drew (its variant knobs). */
export function patternOf(plan: DesignPlan): Pattern | undefined {
  const v = plan.variant;
  const parsed = PatternSchema.safeParse({
    typology: v.typology ?? 'bands',
    core: v.core,
    front: Number(v.front),
    widthShare: Number(v.widthShare),
    slack: Number(v.slack),
    site: v.site ?? 'front',
    align: v.align ?? 'center',
    mirror: Number(v.mirror ?? 0) === 1,
    entry: v.entry ?? 'side',
    dining: v.dining ?? 'back',
    master: v.master ?? 'front',
  });
  return parsed.success ? parsed.data : undefined;
}

/** How alike a library design's brief is to this one (0 = unrelated); only the same building type counts. */
export function briefSimilarity(
  e: Pick<LibraryEntry, 'type' | 'floors' | 'bedrooms' | 'plot'>,
  program: Pick<Program, 'type' | 'floors' | 'bedrooms'>,
  plot: { width: number; depth: number },
): number {
  if (e.type !== program.type) return 0;
  const floors = 1 - Math.min(1, Math.abs(e.floors - program.floors) / 2);
  const beds = 1 - Math.min(1, Math.abs(e.bedrooms - program.bedrooms) / 4);
  const size =
    1 -
    Math.min(
      1,
      (Math.abs(e.plot.width - plot.width) / plot.width +
        Math.abs(e.plot.depth - plot.depth) / plot.depth) /
        2,
    );
  return Math.round((0.3 * floors + 0.3 * beds + 0.4 * size) * 1000) / 1000;
}

/**
 * Variants to try from the library: the patterns of the designs most like this brief, each tagged with the entry
 * that inspired it (the engine then lays it out on this plot and checks it like any other variant).
 */
export function libraryVariants(
  items: readonly LibraryItem[],
  program: Program,
  plot: { width: number; depth: number },
  limit = 40,
): Array<Variant & { inspiredBy: string }> {
  const house = program.type !== 'apartments' && program.type !== 'commercial';
  return items
    .map((e) => ({ e, s: briefSimilarity(e, program, plot) }))
    .filter((x) => x.s > 0.3)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .flatMap(({ e }) => {
      const p = e.pattern;
      // a design type this programme cannot take (a pavilion without a men's majlis, a terrace on one floor)
      if (!house && p.typology !== 'bands') return [];
      if (p.typology === 'pavilion' && !program.majlisMen) return [];
      if (p.typology === 'terrace' && program.floors < 2) return [];
      const v: Variant = { id: '', ...p };
      return [{ ...v, id: `lib-${variantCode(v)}`, inspiredBy: e.id }];
    });
}

/**
 * What offices choose, as a nudge for the ranking: for each knob, the share of similar library designs that chose the
 * same value as this plan (0–1, averaged); 0.5 when the library has nothing similar.
 */
export function knobPrior(
  items: readonly LibraryItem[],
  program: Program,
  plot: { width: number; depth: number },
): (plan: DesignPlan) => number {
  const similar = items.filter((e) => briefSimilarity(e, program, plot) > 0.3);
  if (similar.length === 0) return () => 0.5;
  const keys = ['typology', 'core', 'site', 'entry', 'dining', 'master'] as const;
  const share = new Map<string, number>();
  for (const k of keys)
    for (const e of similar) {
      const key = `${k}:${String(e.pattern[k])}`;
      share.set(key, (share.get(key) ?? 0) + 1 / similar.length);
    }
  return (plan) => {
    const p = patternOf(plan);
    if (!p) return 0.5;
    return keys.reduce((t, k) => t + (share.get(`${k}:${String(p[k])}`) ?? 0), 0) / keys.length;
  };
}

/** A library entry from a released version (no client data: the plan holds geometry only). */
export function entryFromRelease(input: {
  officeId: string;
  officeName: string;
  title: string;
  city: string;
  program: Program;
  plan: DesignPlan;
  builtUpM2: number;
  share: 'pattern' | 'plan';
}): LibraryEntry | undefined {
  const pattern = patternOf(input.plan);
  if (!pattern) return undefined;
  const parsed = LibraryEntrySchema.safeParse({
    officeId: input.officeId,
    officeName: input.officeName,
    title: input.title,
    city: input.city,
    type: input.program.type,
    style: input.program.style,
    floors: input.program.floors,
    bedrooms: input.program.bedrooms,
    plot: { width: input.plan.plot.width, depth: input.plan.plot.depth },
    builtUpM2: Math.round(input.builtUpM2),
    pattern,
    share: input.share,
    ...(input.share === 'plan' ? { plan: input.plan } : {}),
  });
  return parsed.success ? parsed.data : undefined;
}
