import { describe, expect, it } from 'vitest';
import {
  LibraryEntrySchema,
  NATIONAL_REGULATIONS,
  briefSimilarity,
  candidateVariants,
  checkOption,
  confirmProgram,
  entryFromRelease,
  explainOption,
  generatePlan,
  knobPrior,
  patternOf,
  searchOptions,
  zoningFromRegulation,
  type LibraryItem,
  type Plot,
  type Program,
} from '../index.js';

const plot: Plot = {
  width: 22,
  depth: 32,
  streets: { front: 20, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
};
const program = (over: Partial<Program> = {}): Program =>
  confirmProgram({ type: 'villa', floors: 2, bedrooms: 4, majlisWomen: true, ...over }).data!;
const zoning = zoningFromRegulation(NATIONAL_REGULATIONS[0]!, plot, program(), {
  maxHeightM: 14,
}).zoning;

/** A library entry made from a design the engine drew for another office's similar brief. */
function contributed(
  id: string,
  typology: string,
  office: string,
  share: 'pattern' | 'plan',
): LibraryItem {
  const pr = program();
  const v = candidateVariants(pr).find(
    (x) => (x.typology ?? 'bands') === typology && x.core === 'left',
  )!;
  const plan = generatePlan({ ...plot, width: 23, depth: 33 }, zoning, pr, v);
  const e = entryFromRelease({
    officeId: `o-${id}`,
    officeName: office,
    title: 'فيلا دورين',
    city: 'الرياض',
    program: pr,
    plan,
    builtUpM2: 400,
    share,
  })!;
  return { ...e, id };
}

describe('design library: offices’ shared designs, with consent, credited', () => {
  it('keeps a design’s pattern (its arrangement) and, only when shared so, its plan', () => {
    const p = contributed('a', 'court', 'مكتب الأفق', 'pattern');
    expect(LibraryEntrySchema.safeParse(p).success).toBe(true);
    expect(p.pattern.typology).toBe('court');
    expect(p.pattern.core).toBe('left');
    expect(p.plan).toBeUndefined();
    expect(contributed('b', 'court', 'مكتب الأفق', 'plan').plan).toBeDefined();
    // the pattern round-trips from the plan the engine drew
    const plan = generatePlan(plot, zoning, program(), candidateVariants(program())[5]!);
    expect(patternOf(plan)?.typology).toBe('bands');
  });

  it('only learns from briefs of the same building type and similar size', () => {
    const e = contributed('a', 'court', 'مكتب الأفق', 'pattern');
    expect(briefSimilarity(e, program(), plot)).toBeGreaterThan(0.8);
    expect(briefSimilarity(e, { type: 'apartments', floors: 4, bedrooms: 0 }, plot)).toBe(0);
  });

  it('re-lays a contributed pattern on the new plot, checks it, and credits the office', () => {
    const library = [
      contributed('a', 'sidecourt', 'مكتب الأفق', 'pattern'),
      contributed('b', 'sidecourt', 'مكتب النخبة', 'plan'),
      contributed('c', 'pavilion', 'مكتب الديار', 'pattern'),
    ];
    const pr = program();
    const r = searchOptions(plot, zoning, pr, { library });
    expect(r.libraryMatches).toBe(3);
    expect(r.inspired).toBeGreaterThanOrEqual(1);
    const credited = r.options.filter((o) => o.variant.inspiredBy);
    for (const o of credited) {
      expect(checkOption(o, { plot, zoning, program: pr }).failing).toEqual([]);
      expect(['مكتب الأفق', 'مكتب النخبة', 'مكتب الديار']).toContain(o.variant.inspiredOffice);
      const note = explainOption(o, pr, plot, zoning).find((n) => n.key === 'inspired');
      expect(note?.values.office).toBe(o.variant.inspiredOffice);
    }
    // without a library nothing is credited
    expect(searchOptions(plot, zoning, pr).options.some((o) => o.variant.inspiredBy)).toBe(false);
  });

  it('nudges the ranking toward what offices choose', () => {
    const library = ['a', 'b', 'c'].map((id) => contributed(id, 'court', 'مكتب', 'pattern'));
    const prior = knobPrior(library, program(), plot);
    const pr = program();
    const court = generatePlan(
      plot,
      zoning,
      pr,
      candidateVariants(pr).find((v) => v.typology === 'court')!,
    );
    const bands = generatePlan(plot, zoning, pr, candidateVariants(pr)[0]!);
    expect(prior(court)).toBeGreaterThan(prior(bands));
    expect(knobPrior([], pr, plot)(court)).toBe(0.5);
  });
});
