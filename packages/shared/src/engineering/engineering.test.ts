import { describe, expect, it } from 'vitest';
import {
  RULES,
  WATERMARK,
  approvalBlocks,
  area,
  blocksDoor,
  boq,
  canMove,
  confirmProgram,
  detectClashes,
  diffRenovation,
  ductRuns,
  envelopeOf,
  exteriorEdges,
  onFloor,
  outsideSides,
  findPrecedents,
  furnish,
  generateOptions,
  generatePlan,
  missingItems,
  openingsOf,
  parseBrief,
  permitReadiness,
  releaseReadiness,
  renovationOptions,
  runRules,
  schedule,
  structuralScheme,
  summarize,
  sunPosition,
  toDxf,
  toIfc,
  VARIANTS,
  type DesignPlan,
  type Plot,
  type Program,
  type RuleContext,
  type RuleOverrides,
  type Zoning,
} from '../index.js';

const zoning = (over: Partial<Zoning> = {}): Zoning => ({
  use: 'residential',
  setbacks: { front: 4, back: 2, left: 2, right: 2 },
  coverageMax: 0.6,
  farMax: 1.8,
  maxFloors: 3,
  maxHeightM: 12,
  parkingPerUnit: 1,
  ...over,
});
const plot = (w: number, d: number, over: Partial<Plot> = {}): Plot => ({
  width: w,
  depth: d,
  streets: { front: 15, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
  ...over,
});
const program = (over: Partial<Program>): Program =>
  confirmProgram({ type: 'villa', floors: 2, bedrooms: 4, ...over }).data!;

function overlaps(plan: DesignPlan) {
  const eps = 0.01;
  for (const a of plan.rooms)
    for (const b of plan.rooms) {
      if (a === b || a.floor !== b.floor) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > eps && oy > eps) return `${a.id} × ${b.id}`;
    }
  return null;
}

describe('brief agent (deterministic first pass)', () => {
  it('reads an Arabic brief with Arabic-Indic digits and asks only for what is missing', () => {
    const p = parseBrief(
      'أبغى فيلا دورين، ٥ غرف نوم، مجلس رجال ومجلس نساء، مطبخ مفتوح، غرفة خادمة، مسبح ومصعد، طراز نجدي',
    );
    expect(p).toMatchObject({
      type: 'villa',
      floors: 2,
      bedrooms: 5,
      majlisMen: true,
      majlisWomen: true,
      kitchen: 'open',
      maidRoom: true,
      pool: true,
      elevator: true,
      style: 'modern_najdi',
    });
    expect(missingItems(p)).toEqual([]);
    expect(missingItems(parseBrief('عمارة شقق'))).toEqual(['floors', 'bedrooms']);
    expect(parseBrief('a duplex with three bedrooms').bedrooms).toBe(3);
  });
});

describe('layout engine: golden briefs stay inside setbacks and coverage', () => {
  const cases: Array<[string, Plot, Zoning, Program]> = [
    ['villa on 20×30', plot(20, 30), zoning(), program({})],
    [
      'duplex',
      plot(15, 25),
      zoning({ coverageMax: 0.65 }),
      program({ type: 'duplex', bedrooms: 3 }),
    ],
    [
      '4-floor apartment building',
      plot(25, 30),
      zoning({ maxFloors: 4, farMax: 2.6, maxHeightM: 16 }),
      program({
        type: 'apartments',
        floors: 4,
        bedrooms: 0,
        unitsPerFloor: 2,
        elevator: true,
        parking: 8,
      }),
    ],
    [
      'corner plot',
      plot(25, 25, { streets: { front: 20, back: 0, left: 15, right: 0 } }),
      zoning({ setbacks: { front: 4, back: 2, left: 3, right: 2 } }),
      program({ bedrooms: 5, majlisWomen: true, maidRoom: true }),
    ],
    [
      'narrow deep plot',
      plot(12, 40),
      zoning({ setbacks: { front: 3, back: 2, left: 1.5, right: 1.5 } }),
      program({ bedrooms: 3 }),
    ],
  ];
  for (const [name, pl, z, pr] of cases) {
    it(name, () => {
      const options = generateOptions(pl, z, pr, 4);
      expect(options.length).toBeGreaterThanOrEqual(3);
      for (const plan of options) {
        const env = envelopeOf(pl, z);
        const f = plan.footprint;
        expect(f.x).toBeGreaterThanOrEqual(env.x - 0.01);
        expect(f.y).toBeGreaterThanOrEqual(env.y - 0.01);
        expect(f.x + f.w).toBeLessThanOrEqual(env.x + env.w + 0.01);
        expect(f.y + f.h).toBeLessThanOrEqual(env.y + env.h + 0.01);
        expect(area(f) / (pl.width * pl.depth)).toBeLessThanOrEqual(z.coverageMax + 1e-6);
        expect(overlaps(plan)).toBeNull();
        for (const r of plan.rooms) {
          expect(r.x).toBeGreaterThanOrEqual(f.x - 0.01);
          expect(r.x + r.w).toBeLessThanOrEqual(f.x + f.w + 0.02);
          expect(r.y + r.h).toBeLessThanOrEqual(f.y + f.h + 0.02);
        }
        for (let fl = 0; fl < plan.floors; fl++)
          expect(plan.rooms.some((r) => r.floor === fl && r.type === 'stair')).toBe(true);
        const zoningResults = runRules({ plan, plot: pl, zoning: z, program: pr }).filter(
          (r) => r.pack === 'zoning' && r.id !== 'Z-PARKING',
        );
        expect(zoningResults.every((r) => r.status === 'passed')).toBe(true);
      }
    });
  }

  it('is deterministic: the same brief gives the same plans', () => {
    const a = generatePlan(plot(20, 30), zoning(), program({}), VARIANTS[0]!);
    const b = generatePlan(plot(20, 30), zoning(), program({}), VARIANTS[0]!);
    expect(a).toEqual(b);
  });
});

describe('rule engine', () => {
  const base = (): RuleContext => {
    const pl = plot(20, 30);
    const z = zoning();
    const pr = program({});
    return { plan: generatePlan(pl, z, pr, VARIANTS[0]!), plot: pl, zoning: z, program: pr };
  };
  const verifiedAll: RuleOverrides = Object.fromEntries(
    RULES.filter((r) => r.pack === 'code').map((r) => [
      r.id,
      { verifiedBy: 'eng1', verifiedAt: '2026-10-15' },
    ]),
  );

  it('never reports a code rule as passed before an engineer verified its parameters', () => {
    const results = runRules(base());
    for (const r of results.filter((r) => r.pack === 'code')) expect(r.status).toBe('not_checked');
    expect(
      results.filter((r) => r.pack === 'zoning').every((r) => r.status !== 'not_checked'),
    ).toBe(true);
    expect(results.find((r) => r.id === 'C-ROOM-AREA')?.preview).toBeDefined();
    const fire = results.find((r) => r.id === 'C-FIRE')!;
    expect(fire.status).toBe('not_checked');
    expect(fire.preview).toBeUndefined();
  });

  // one passing and one failing fixture for every rule that can run
  const fixtures: Record<
    string,
    [(c: RuleContext) => RuleContext, (c: RuleContext) => RuleContext]
  > = {
    'Z-SETBACK': [
      (c) => c,
      (c) => ({ ...c, plan: { ...c.plan, footprint: { ...c.plan.footprint, x: 0 } } }),
    ],
    'Z-COVERAGE': [(c) => c, (c) => ({ ...c, zoning: { ...c.zoning, coverageMax: 0.2 } })],
    'Z-FAR': [(c) => c, (c) => ({ ...c, zoning: { ...c.zoning, farMax: 0.3 } })],
    'Z-FLOORS': [(c) => c, (c) => ({ ...c, zoning: { ...c.zoning, maxFloors: 1 } })],
    'Z-HEIGHT': [(c) => c, (c) => ({ ...c, zoning: { ...c.zoning, maxHeightM: 5 } })],
    'Z-PARKING': [(c) => c, (c) => ({ ...c, program: { ...c.program, parking: 0 } })],
    // pass: no annex (or one within its share); fail: the same annex where only 10 % is allowed
    'Z-ANNEX': [
      (c) => c,
      (c) => {
        const z = { ...c.zoning, roofAnnexShare: 0.7 };
        const plan = generatePlan(
          c.plot as Plot,
          z,
          { ...c.program, roofAnnex: true },
          VARIANTS[0]!,
        );
        return { ...c, plan, zoning: { ...z, roofAnnexShare: 0.1 } };
      },
    ],
    'C-ROOM-AREA': [(c) => c, (c) => ({ ...c, plan: shrink(c.plan, 'bedroom', 2.5, 2.5) })],
    'C-ROOM-DIM': [(c) => c, (c) => ({ ...c, plan: shrink(c.plan, 'bedroom', 1.8, 6) })],
    'C-CEILING': [(c) => c, (c) => ({ ...c, plan: { ...c.plan, clearHeight: 2.3 } })],
    'C-DAYLIGHT': [(c) => c, (c) => ({ ...c, plan: enclose(c.plan, 'majlis_men') })],
    'C-WET-VENT': [
      // pass: every bathroom has an outside wall; fail: a WC moved inside the building
      (c) => ({
        ...c,
        plan: {
          ...c.plan,
          rooms: c.plan.rooms.filter(
            (r) =>
              !(
                (r.type === 'bathroom' || r.type === 'guest_wc') &&
                outsideSides(r, onFloor(c.plan, r.floor)).length === 0
              ),
          ),
        },
      }),
      (c) => ({ ...c, plan: enclose(c.plan, 'guest_wc') }),
    ],
    // pass: no inner court at all; fail: a 2 m court cut into the men's majlis, walled in on every side
    'C-COURT': [(c) => c, (c) => ({ ...c, plan: narrowCourt(c.plan) })],
    // pass: the windows the engine draws; fail: a 40 m² majlis with no outside wall but one small window
    'C-GLAZING': [(c) => c, (c) => ({ ...c, plan: enclose(c.plan, 'majlis_men') })],
    // a 3.3 m floor needs about 4.5 m of stair: pass with a 5 m stair, fail with 3.5 m
    'C-STAIR-RUN': [
      (c) => ({ ...c, plan: shrink(c.plan, 'stair', 3, 5) }),
      (c) => ({ ...c, plan: shrink(c.plan, 'stair', 3, 3.5) }),
    ],
    'C-CORRIDOR': [(c) => c, (c) => ({ ...c, plan: shrink(c.plan, 'corridor', 20, 0.8) })],
    'C-STAIR': [(c) => c, (c) => ({ ...c, plan: shrink(c.plan, 'stair', 1.6, 5) })],
    'C-EGRESS': [
      (c) => c,
      (c) => ({
        ...c,
        plan: {
          ...c.plan,
          rooms: c.plan.rooms.filter((r) => !(r.type === 'stair' && r.floor === 1)),
        },
      }),
    ],
    'C-ACCESSIBLE-WC': [
      (c) => c,
      (c) => ({
        ...c,
        plan: {
          ...c.plan,
          rooms: c.plan.rooms.filter(
            (r) => !(r.floor === 0 && (r.type === 'guest_wc' || r.type === 'bathroom')),
          ),
        },
      }),
    ],
  };

  /** Replaces the men's majlis with closets around a 2 m wide inner court. */
  function narrowCourt(plan: DesignPlan): DesignPlan {
    const r = plan.rooms.find((x) => x.type === 'majlis_men')!;
    const cx = r.x + (r.w - 2) / 2;
    const part = (
      id: string,
      type: 'closet' | 'courtyard',
      x: number,
      y: number,
      w: number,
      h: number,
    ) => ({ id, type, floor: r.floor, x, y, w, h }) as const;
    return {
      ...plan,
      rooms: plan.rooms
        .filter((x) => x !== r)
        .concat([
          part('court', 'courtyard', cx, r.y + 0.6, 2, r.h - 1.2),
          part('c-front', 'closet', r.x, r.y, r.w, 0.6),
          part('c-back', 'closet', r.x, r.y + r.h - 0.6, r.w, 0.6),
          part('c-left', 'closet', r.x, r.y + 0.6, cx - r.x, r.h - 1.2),
          part('c-right', 'closet', cx + 2, r.y + 0.6, r.x + r.w - cx - 2, r.h - 1.2),
        ]),
    };
  }

  /** Wraps the first room of a type in a 0.5 m ring of closets inside its own outline: no outside wall left. */
  function enclose(plan: DesignPlan, type: string): DesignPlan {
    const r = plan.rooms.find((x) => x.type === type)!;
    const t = 0.5;
    const ring = (id: string, x: number, y: number, w: number, h: number) =>
      ({ id: `ring-${id}`, type: 'closet', floor: r.floor, x, y, w, h }) as const;
    return {
      ...plan,
      rooms: plan.rooms
        .filter((x) => x !== r)
        .concat([
          { ...r, x: r.x + t, y: r.y + t, w: r.w - 2 * t, h: r.h - 2 * t },
          ring('front', r.x, r.y, r.w, t),
          ring('back', r.x, r.y + r.h - t, r.w, t),
          ring('left', r.x, r.y + t, t, r.h - 2 * t),
          ring('right', r.x + r.w - t, r.y + t, t, r.h - 2 * t),
        ]),
    };
  }

  function shrink(plan: DesignPlan, type: string, w: number, h: number, inset = 0): DesignPlan {
    let done = false;
    return {
      ...plan,
      rooms: plan.rooms.map((r) => {
        if (done || r.type !== type) return r;
        done = true;
        return { ...r, x: r.x + inset, y: r.y + inset, w, h };
      }),
    };
  }

  for (const rule of RULES.filter((r) => r.check)) {
    it(`${rule.id}: one passing and one failing fixture`, () => {
      const f = fixtures[rule.id];
      expect(f, `fixtures for ${rule.id}`).toBeDefined();
      const [pass, fail] = f!;
      const res = (c: RuleContext) => runRules(c, verifiedAll).find((r) => r.id === rule.id)!;
      expect(res(pass(base())).status).toBe('passed');
      const failed = res(fail(base()));
      expect(failed.status).toBe('failed');
    });
  }

  it('an engineer can change the parameters, and the report counts checked / passed / failed / not checked', () => {
    const c = base();
    const strict = runRules(c, {
      ...verifiedAll,
      'C-ROOM-AREA': { params: { minArea: 40 }, verifiedBy: 'eng1' },
    });
    expect(strict.find((r) => r.id === 'C-ROOM-AREA')?.status).toBe('failed');
    const s = summarize(strict);
    expect(s.checked + s.notChecked).toBe(RULES.length);
    expect(s.notChecked).toBe(RULES.filter((r) => !r.check).length);
  });
});

describe('disciplines and coordination', () => {
  const pl = plot(20, 30);
  const plan = generatePlan(pl, zoning(), program({}), VARIANTS[0]!);

  it('lays a structural grid within the span the office set', () => {
    const s = structuralScheme(plan, { maxSpan: 5, beamDepth: 0.5 });
    expect(s.spanX).toBeLessThanOrEqual(5);
    expect(s.spanY).toBeLessThanOrEqual(5);
    expect(s.columns.length).toBe(s.gridX.length * s.gridY.length);
    expect(s.slab).toBe('solid');
  });

  it('catches a seeded duct/beam clash, and none when the duct fits', () => {
    const s = structuralScheme(plan);
    expect(detectClashes(plan, s, ductRuns(plan, 0.2))).toHaveLength(0);
    const clashes = detectClashes(plan, s, ductRuns(plan, 0.6));
    expect(clashes.length).toBeGreaterThan(0);
    expect(clashes[0]!.overlap).toBeGreaterThan(0);
  });

  it('gives a cost range (never a quote) and a schedule', () => {
    const b = boq(plan);
    expect(b.min).toBeGreaterThan(0);
    expect(b.max).toBeGreaterThan(b.min);
    expect(schedule(plan).totalWeeks).toBeGreaterThan(10);
  });
});

describe('exports', () => {
  const plan = generatePlan(plot(20, 30), zoning(), program({}), VARIANTS[0]!);

  it('writes a well-formed DXF R12', () => {
    const dxf = toDxf(plan, (r) => (r.type === 'bedroom' ? 'غرفة نوم' : r.type));
    const lines = dxf.trim().split('\n');
    expect(lines.length % 2).toBe(0); // group code / value pairs
    for (let i = 0; i < lines.length; i += 2) expect(lines[i]).toMatch(/^-?\d+$/);
    expect(lines.slice(0, 4)).toEqual(['0', 'SECTION', '2', 'HEADER']);
    expect(lines.slice(-2)).toEqual(['0', 'EOF']);
    expect(dxf).toContain('A-WALL');
    expect(dxf).toContain('\\U+063A'); // Arabic label escaped
  });

  it('writes an IFC4 file whose references all resolve, with one space per room', () => {
    const ifc = toIfc(plan, { project: 'Villa A' });
    expect(ifc.startsWith('ISO-10303-21;')).toBe(true);
    expect(ifc).toContain("FILE_SCHEMA(('IFC4'));");
    const defined = new Set([...ifc.matchAll(/^#(\d+)=/gm)].map((m) => m[1]));
    const used = [...ifc.matchAll(/#(\d+)(?!=)/g)].map((m) => m[1]);
    for (const u of used) expect(defined.has(u), `#${u}`).toBe(true);
    expect((ifc.match(/IFCSPACE\(/g) ?? []).length).toBe(plan.rooms.length);
    expect((ifc.match(/IFCBUILDINGSTOREY\(/g) ?? []).length).toBe(plan.floors);
    expect(ifc).toContain('DRAFT');
  });
});

describe('3D furnishing never blocks a door', () => {
  it('places furniture inside rooms and clear of doors', () => {
    const plan = generatePlan(plot(20, 30), zoning(), program({ majlisWomen: true }), VARIANTS[1]!);
    const pieces = furnish(plan);
    expect(pieces.length).toBeGreaterThan(5);
    for (const p of pieces) {
      const r = plan.rooms.find((x) => x.id === p.roomId)!;
      expect(p.x).toBeGreaterThanOrEqual(r.x);
      expect(p.x + p.w).toBeLessThanOrEqual(r.x + r.w + 1e-6);
      expect(blocksDoor(p, plan)).toBe(false);
    }
    expect(openingsOf(plan).some((o) => o.kind === 'entry')).toBe(true);
  });
});

describe('workflow: approvals and release', () => {
  const eng = {
    verified: true,
    active: true,
    discipline: 'structural' as const,
    expiresOn: '2027-01-01',
  };
  it('only a verified, current engineer of that discipline in a verified office may approve', () => {
    expect(
      approvalBlocks({ officeVerified: true, engineer: eng }, 'structural', '2026-10-15'),
    ).toEqual([]);
    expect(
      approvalBlocks({ officeVerified: false, engineer: eng }, 'structural', '2026-10-15'),
    ).toContain('office_not_verified');
    expect(
      approvalBlocks({ officeVerified: true, engineer: eng }, 'electrical', '2026-10-15'),
    ).toContain('wrong_discipline');
    expect(
      approvalBlocks({ officeVerified: true, engineer: eng }, 'structural', '2027-02-01'),
    ).toContain('membership_expired');
    expect(approvalBlocks({ officeVerified: true }, 'structural', '2026-10-15')).toEqual([
      'not_an_engineer',
    ]);
  });
  it('releases only when every required discipline approved this exact version', () => {
    const r = releaseReadiness(
      ['architectural', 'structural'],
      [
        { discipline: 'architectural', sha256: 'abc' },
        { discipline: 'structural', sha256: 'old' },
      ],
      'abc',
    );
    expect(r).toEqual({ ready: false, missing: ['structural'], stale: ['structural'] });
    expect(canMove('concepts', 'picked', 'client')).toBe(true);
    expect(canMove('review', 'released', 'client')).toBe(false);
    expect(WATERMARK.ar).toContain('مسودة');
  });
});

describe('renovation, permit, sun and precedents', () => {
  it('marks demolish/new and flags every structural change', () => {
    const existing = generatePlan(
      plot(20, 30),
      zoning(),
      program({ floors: 1, bedrooms: 3 }),
      VARIANTS[0]!,
    );
    const proposal: DesignPlan = {
      ...existing,
      floors: 2,
      rooms: [
        ...existing.rooms.filter((r) => r.type !== 'dining'),
        {
          id: '1-bedroom-9',
          type: 'bedroom',
          floor: 1,
          x: existing.footprint.x,
          y: existing.footprint.y,
          w: 4,
          h: 4,
        },
      ],
    };
    const d = diffRenovation(existing, proposal);
    expect(d.rooms.some((r) => r.type === 'dining' && r.state === 'demolish')).toBe(true);
    expect(d.rooms.some((r) => r.id === '1-bedroom-9' && r.state === 'new')).toBe(true);
    expect(d.flags.map((f) => f.reason).sort()).toEqual(['demolition', 'new_floor']);
    const opts = renovationOptions(existing, [
      { id: 'f1', type: 'crack', severity: 'high', note: '' },
    ]);
    expect(opts.map((o) => o.level)).toEqual(['refresh', 'partial', 'full']);
    expect(opts[0]!.coversFindings).toBe(false);
  });

  it('shows the Balady checklist as ready/missing', () => {
    const r = permitReadiness({ deed: 'ready' });
    expect(r.ready).toBe(false);
    expect(r.missing).toContain('soil_report');
    expect(r.rows.find((x) => x.item === 'traffic_study')?.state).toBe('not_required');
  });

  it('puts the sun almost overhead in Riyadh at noon in June', () => {
    const s = sunPosition(new Date(Date.UTC(2026, 5, 21, 9, 0)), 24.71, 46.68);
    expect(s.altitude).toBeGreaterThan(80);
    const evening = sunPosition(new Date(Date.UTC(2026, 5, 21, 15, 30)), 24.71, 46.68);
    expect(evening.azimuth).toBeGreaterThan(270);
  });

  it('cites only precedents shared with consent', () => {
    const lib = [
      {
        id: 'a',
        title: 'A',
        summary: '',
        tags: ['courtyard', 'najdi'] as const,
        source: 'office_project' as const,
        consent: true,
        citation: 'A 2024',
      },
      {
        id: 'b',
        title: 'B',
        summary: '',
        tags: ['courtyard'] as const,
        source: 'office_project' as const,
        consent: false,
        citation: 'B',
      },
    ].map((p) => ({ ...p, tags: [...p.tags] }));
    expect(findPrecedents(lib, { tags: ['courtyard'] }).map((p) => p.id)).toEqual(['a']);
  });
});
