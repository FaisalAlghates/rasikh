import { describe, expect, it } from 'vitest';
import {
  BOQ_SECTIONS,
  DEFAULT_RATES,
  MIN_DIFFERENCE,
  NATIONAL_REGULATIONS,
  accessIssues,
  allowedThrough,
  area,
  boq,
  boqCsv,
  isOpen,
  checkOption,
  confirmProgram,
  deferredItems,
  envelopeOf,
  explainOption,
  missingRooms,
  optionDistance,
  openingsOf,
  optionLabel,
  POOL_CLEAR,
  siteShortfall,
  zoningFromRegulation,
  parseBrief,
  parsePlotSize,
  programCounts,
  programRooms,
  searchOptions,
  type DesignPlan,
  type Plot,
  type Program,
  type Rates,
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
const plot = (w: number, d: number): Plot => ({
  width: w,
  depth: d,
  streets: { front: 15, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
});
const program = (over: Partial<Program>): Program =>
  confirmProgram({ type: 'villa', floors: 2, bedrooms: 4, ...over }).data!;

const overlapArea = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) - 0.01) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) - 0.01);

function overlaps(plan: DesignPlan) {
  for (const a of plan.rooms)
    for (const b of plan.rooms) {
      if (a === b || a.floor !== b.floor) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.01 && oy > 0.01) return `${a.id} × ${b.id}`;
    }
  return null;
}

describe('brief agent reads everything the client wrote', () => {
  it('reads a rich Arabic brief (rooms, bathrooms, area, budget, plot) and never takes "دورات مياه" for floors', () => {
    const text =
      'فيلا دورين على أرض ٢٥×٣٥، ٥ غرف نوم و٦ دورات مياه، مجلس رجال ومجلس نساء، غرفة ضيوف، مصلى، غرفة مكتب، مستودع، مطبخ تحضيري، غرفة خادمة وسائق، مصعد، مسطح البناء حوالي ٥٠٠ م٢، الميزانية ١٫٢ مليون';
    expect(parseBrief(text)).toMatchObject({
      type: 'villa',
      floors: 2,
      bedrooms: 5,
      bathrooms: 6,
      majlisMen: true,
      majlisWomen: true,
      guestRoom: true,
      prayerRoom: true,
      office: true,
      storage: true,
      prepKitchen: true,
      maidRoom: true,
      driverRoom: true,
      elevator: true,
      targetAreaM2: 500,
      budgetSar: { min: 1_020_000, max: 1_200_000 },
    });
    expect(parsePlotSize(text)).toEqual({ width: 25, depth: 35 });
    expect(parseBrief('فيلا ٥ دورات مياه').floors).toBeUndefined();
    expect(parsePlotSize('عرض الأرض 18 وعمقها 32')).toEqual({ width: 18, depth: 32 });
  });

  it('reads an English brief', () => {
    expect(
      parseBrief(
        'A 3 bedroom villa, 2 floors, 4 bathrooms, home office and a gym, built-up area 400 m2, budget 900k',
      ),
    ).toMatchObject({
      type: 'villa',
      floors: 2,
      bedrooms: 3,
      bathrooms: 4,
      office: true,
      gym: true,
      targetAreaM2: 400,
      budgetSar: { min: 765_000, max: 900_000 },
    });
  });

  it('honours the bathroom count: one per bedroom first, extra ones by the family hall', () => {
    const baths = (p: Program) => programRooms(p).filter((r) => r.type === 'bathroom').length;
    expect(baths(program({ bedrooms: 5, bathrooms: 6 }))).toBe(5); // + the guest WC = 6
    expect(baths(program({ bedrooms: 3, bathrooms: 6 }))).toBe(5);
    expect(baths(program({ bedrooms: 4 }))).toBe(2); // no count: master + one per two bedrooms
  });
});

describe('option search: more than five different designs, each matching the brief and every automatic check', () => {
  const cases: Array<[string, Plot, Zoning, Program]> = [
    ['villa on 20×30', plot(20, 30), zoning(), program({})],
    [
      'rich villa brief',
      plot(25, 35),
      zoning(),
      program({
        bedrooms: 5,
        bathrooms: 6,
        majlisWomen: true,
        maidRoom: true,
        driverRoom: true,
        guestRoom: true,
        office: true,
        prayerRoom: true,
        storage: true,
        prepKitchen: true,
        elevator: true,
        pool: true,
        separateGuestEntry: true,
        parking: 3,
      }),
    ],
    [
      'duplex',
      plot(15, 25),
      zoning({ coverageMax: 0.65 }),
      program({ type: 'duplex', bedrooms: 3 }),
    ],
    [
      'apartment building',
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
      'narrow deep plot',
      plot(12, 40),
      zoning({ setbacks: { front: 3, back: 2, left: 1.5, right: 1.5 } }),
      program({ bedrooms: 3 }),
    ],
    ['single-storey villa', plot(30, 30), zoning(), program({ floors: 1, bedrooms: 3 })],
  ];

  for (const [name, pl, z, pr] of cases) {
    it(name, () => {
      const r = searchOptions(pl, z, pr, { count: 8 });
      expect(r.options.length).toBeGreaterThanOrEqual(6);
      expect(r.compliant).toBeGreaterThanOrEqual(r.options.length);
      const env = envelopeOf(pl, z);
      for (const plan of r.options) {
        // everything the client asked for is in the plan
        expect(missingRooms(plan, pr)).toEqual([]);
        const c = checkOption(plan, { plot: pl, zoning: z, program: pr });
        expect(c.failing).toEqual([]);
        for (const res of c.results) {
          if (res.pack === 'zoning') expect(res.status).toBe('passed');
          // code rules: never "passed" before an engineer verified them, but every automatic one would pass
          else if (res.preview) expect(res.preview).toBe('would_pass');
          else expect(res.status).toBe('not_checked');
        }
        expect(accessIssues(plan)).toEqual([]);
        expect(overlaps(plan)).toBeNull();
        // the parking bays (and the pool, when asked for) are on the site, in the yards
        expect(siteShortfall(plan, pr)).toEqual({ parking: 0, pool: false, guestEntry: false });
        for (const s of plan.site ?? []) {
          expect(s.x).toBeGreaterThanOrEqual(-0.01);
          expect(s.y).toBeGreaterThanOrEqual(-0.01);
          expect(s.x + s.w).toBeLessThanOrEqual(pl.width + 0.01);
          expect(s.y + s.h).toBeLessThanOrEqual(pl.depth + 0.01);
          expect(overlapArea(s, plan.footprint)).toBe(0);
          for (const o of plan.site ?? []) if (o !== s) expect(overlapArea(s, o)).toBe(0);
        }
        // a bay down a side passage keeps its driveway through the front yard clear
        const bays = (plan.site ?? []).filter((s) => s.type === 'parking');
        const fpY = plan.footprint.y;
        for (const t of bays.filter((b) => b.y >= fpY - 0.01))
          for (const b of bays.filter((x) => x.y < fpY - 0.01))
            expect(overlapArea({ x: t.x, y: 0, w: t.w, h: fpY }, b)).toBe(0);
        const f = plan.footprint;
        expect(f.x).toBeGreaterThanOrEqual(env.x - 0.01);
        expect(f.y).toBeGreaterThanOrEqual(env.y - 0.01);
        expect(f.x + f.w).toBeLessThanOrEqual(env.x + env.w + 0.01);
        expect(f.y + f.h).toBeLessThanOrEqual(env.y + env.h + 0.01);
      }
      // genuinely different: every pair differs in at least MIN_DIFFERENCE visible traits (a mirror image is not)
      for (let i = 0; i < r.options.length; i++)
        for (let j = i + 1; j < r.options.length; j++)
          expect(optionDistance(r.options[i]!, r.options[j]!)).toBeGreaterThanOrEqual(
            MIN_DIFFERENCE,
          );
    });
  }

  it('is deterministic and quick', () => {
    const t0 = performance.now();
    const a = searchOptions(plot(20, 30), zoning(), program({}));
    expect(performance.now() - t0).toBeLessThan(3000);
    const b = searchOptions(plot(20, 30), zoning(), program({}));
    expect(a.options).toEqual(b.options);
  });

  it('checks with the parameters the office engineer verified (then reports "passed")', () => {
    const overrides = { 'C-ROOM-AREA': { params: { minArea: 12 }, verifiedBy: 'eng-1' } };
    const r = searchOptions(plot(20, 30), zoning(), program({}), { overrides });
    expect(r.options.length).toBeGreaterThanOrEqual(6);
    for (const plan of r.options) {
      const c = checkOption(
        plan,
        { plot: plot(20, 30), zoning: zoning(), program: program({}) },
        overrides,
      );
      expect(c.results.find((x) => x.id === 'C-ROOM-AREA')!.status).toBe('passed');
    }
  });

  it('generates more options that differ from the ones already made', () => {
    const first = searchOptions(plot(20, 30), zoning(), program({}), { count: 6 });
    const more = searchOptions(plot(20, 30), zoning(), program({}), {
      count: 6,
      existing: first.options,
    });
    expect(more.options.length).toBeGreaterThan(0);
    for (const m of more.options)
      for (const o of first.options)
        expect(optionDistance(m, o)).toBeGreaterThanOrEqual(MIN_DIFFERENCE);
  });

  it('draws the pool clear of the building and a guest entrance into the men majlis', () => {
    const pr = program({ pool: true, separateGuestEntry: true });
    const r = searchOptions(plot(22, 32), zoning(), pr);
    expect(r.options.length).toBeGreaterThanOrEqual(6);
    for (const plan of r.options) {
      const pool = plan.site!.find((s) => s.type === 'pool')!;
      const fp = plan.footprint;
      const gapX = Math.max(fp.x - (pool.x + pool.w), pool.x - (fp.x + fp.w));
      const gapY = Math.max(fp.y - (pool.y + pool.h), pool.y - (fp.y + fp.h));
      expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(POOL_CLEAR - 0.01);
      const majlis = plan.rooms.find((x) => x.type === 'majlis_men' && x.floor === 0)!;
      expect(openingsOf(plan).some((o) => o.kind === 'entry' && o.roomId === majlis.id)).toBe(true);
      const notes = explainOption(plan, pr, plot(22, 32), zoning()).map((n) => n.key);
      expect(notes).toEqual(expect.arrayContaining(['parking', 'pool', 'guestEntry']));
    }
  });

  it('says why nothing passes instead of offering a non-compliant design', () => {
    const r = searchOptions(plot(20, 30), zoning({ parkingPerUnit: 2 }), program({ parking: 1 }));
    expect(r.options).toEqual([]);
    expect(r.blocking[0]!.id).toBe('Z-PARKING');
    // twelve cars do not fit in the yards of a 15 × 25 plot
    const crowded = searchOptions(plot(15, 25), zoning(), program({ parking: 12 }));
    expect(crowded.options).toEqual([]);
    expect(crowded.blocking.map((b) => b.id)).toContain('SITE');
    expect(
      searchOptions(plot(20, 30), zoning({ maxFloors: 2 }), program({ floors: 3 })).floorsReduced,
    ).toBe(true);
  });

  it('explains each option in terms of the brief', () => {
    const pr = program({ majlisWomen: true, pool: true });
    const [o] = searchOptions(plot(20, 30), zoning(), pr).options;
    const notes = explainOption(o!, pr, plot(20, 30), zoning());
    expect(notes.map((n) => n.key)).toEqual(
      expect.arrayContaining(['program', 'core', 'entry', 'yard', 'area']),
    );
    expect(programCounts(pr).find((c) => c.type === 'majlis_women')?.n).toBe(1);
    expect(deferredItems({ ...pr, basement: true })).toEqual(['basement']);
    // the pool is drawn now, so it is not deferred
    expect(deferredItems(pr)).toEqual([]);
    expect([0, 1, 25, 26, 27].map(optionLabel)).toEqual(['A', 'B', 'Z', 'AA', 'AB']);
  });
});

describe('access: every room has a proper door', () => {
  it('never reaches a bedroom through another bedroom or a WC through the kitchen', () => {
    expect(allowedThrough('bedroom', 'corridor')).toBe(true);
    expect(allowedThrough('bedroom', 'bedroom')).toBe(false);
    expect(allowedThrough('bathroom', 'bedroom')).toBe(true);
    expect(allowedThrough('guest_wc', 'kitchen')).toBe(false);
    expect(allowedThrough('maid_room', 'kitchen')).toBe(true);
  });

  it('flags a bedroom whose only door opens into another bedroom', () => {
    const room = (
      id: string,
      type: 'corridor' | 'bedroom',
      x: number,
      y: number,
      w: number,
      h: number,
    ) => ({ id, type, floor: 0, x, y, w, h }) as const;
    const plan: DesignPlan = {
      plot: { width: 10, depth: 10 },
      envelope: { x: 0, y: 0, w: 10, h: 10 },
      footprint: { x: 0, y: 0, w: 10, h: 9.4 },
      floors: 1,
      floorHeight: 3.3,
      clearHeight: 2.9,
      variant: {},
      rooms: [
        room('0-corridor-1', 'corridor', 0, 0, 10, 1.4),
        room('0-bedroom-1', 'bedroom', 0, 1.4, 5, 4),
        // behind bedroom 1, with bedroom 3 its largest neighbour: no door to the corridor
        room('0-bedroom-2', 'bedroom', 0, 5.4, 5, 4),
        room('0-bedroom-3', 'bedroom', 5, 1.4, 5, 8),
      ],
    };
    expect(accessIssues(plan)).toEqual(['0-bedroom-2']);
  });
});

describe('bill of quantities for every option', () => {
  const plan = searchOptions(plot(20, 30), zoning(), program({})).options[0]!;

  it('itemises earthworks, concrete by element, rebar, masonry, insulation, finishes, openings and MEP', () => {
    const b = boq(plan);
    // 17 building items, plus paving for the two parking bays (no pool asked for)
    expect(b.lines).toHaveLength(18);
    expect(new Set(b.lines.map((l) => l.section))).toEqual(new Set(BOQ_SECTIONS));
    expect(b.lines.find((l) => l.item === 'pool')).toBeUndefined();
    const withPool = searchOptions(plot(22, 32), zoning(), program({ pool: true })).options[0]!;
    const pool = boq(withPool).lines.find((l) => l.item === 'pool')!;
    expect(pool.no).toBe('8.2');
    expect(pool.qty).toBeGreaterThanOrEqual(18);
    for (const l of b.lines) {
      expect(l.qty).toBeGreaterThan(0);
      expect(l.max).toBeGreaterThanOrEqual(l.min);
    }
    expect(b.min).toBe(b.lines.reduce((s, l) => s + l.min, 0));
    expect(b.max).toBeGreaterThan(b.min);
    expect(b.perM2[0]).toBeGreaterThan(0);
    // the tiled floor is the plan's floor area
    expect(b.lines.find((l) => l.item === 'tiling')!.qty).toBeCloseTo(
      plan.rooms.filter((r) => !isOpen(r.type)).reduce((s, r) => s + area(r), 0),
      0,
    );
  });

  it('prices with rates saved before new items existed (defaults fill the gaps)', () => {
    const old = { concretePerM3: [700, 950] } as Partial<Rates>;
    const b = boq(plan, undefined, old);
    expect(Number.isFinite(b.min) && Number.isFinite(b.max)).toBe(true);
    const concrete = b.lines.find((l) => l.item === 'concreteSlabs')!;
    expect(concrete.min).toBe(Math.round(concrete.qty * 700));
    expect(b.lines.find((l) => l.item === 'rebar')!.min).toBeGreaterThan(0);
    expect(Object.keys(DEFAULT_RATES)).toContain('rebarPerTon');
  });

  it('exports CSV a spreadsheet opens in Arabic', () => {
    const b = boq(plan);
    const csv = boqCsv(b, {
      item: (i) => `بند ${i}`,
      unit: (u) => u,
      head: ['رقم', 'البند', 'الكمية', 'الوحدة', 'من', 'إلى'],
    });
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.trim().split('\r\n')).toHaveLength(b.lines.length + 2);
  });
});

describe('designs on the Ministry of Municipalities and Housing requirements', () => {
  it('a villa with a roof annex, on a corner plot: every option within the requirements, the range of design types', () => {
    const pl = { ...plot(22, 32), streets: { front: 20, back: 0, left: 15, right: 0 } };
    const reg = NATIONAL_REGULATIONS.find((r) => r.id === 'momah-2024-villa')!;
    const pr = program({ roofAnnex: true, majlisWomen: true, pool: true });
    const { zoning: z } = zoningFromRegulation(reg, pl, pr, { maxHeightM: 14 });
    expect(z.setbacks).toEqual({ front: 4, back: 1.5, left: 3, right: 1.5 });
    const r = searchOptions(pl, z, pr, { count: 8 });
    expect(r.options.length).toBeGreaterThanOrEqual(6);
    const kinds = new Set(r.options.map((o) => o.variant.typology));
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    for (const plan of r.options) {
      const c = checkOption(plan, { plot: pl, zoning: z, program: pr });
      expect(c.failing).toEqual([]);
      expect(plan.annex).toBe(true);
      expect(c.results.find((x) => x.id === 'Z-ANNEX')!.status).toBe('passed');
      expect(c.results.find((x) => x.id === 'Z-FLOORS')!.value).toBe(2);
      expect(deferredItems(pr, plan)).toEqual([]);
    }
  });
});
