import { area } from './geometry.js';
import type { DesignPlan, PlanRoom } from './schemas.js';

/**
 * Renovation and restoration (الترميم): condition findings on an existing building, options from a refresh to a
 * full renovation, and an existing / demolish / new set. Any structural change is flagged for the structural engineer
 * and a permit. Registered heritage buildings need the Heritage Commission's approval; Rasikh only documents them.
 */

export const FINDING_TYPES = [
  'crack',
  'rebar_corrosion',
  'spalling',
  'damp',
  'leak',
  'settlement',
  'old_mep',
] as const;
export type FindingType = (typeof FINDING_TYPES)[number];
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  roomId?: string;
  type: FindingType;
  severity: Severity;
  note: string;
}

/** Findings that point at the structure always need the structural engineer, whatever their severity. */
export const STRUCTURAL_FINDINGS: readonly FindingType[] = [
  'crack',
  'rebar_corrosion',
  'spalling',
  'settlement',
];

export function conditionSummary(findings: Finding[]) {
  const by: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) by[f.severity]++;
  const structural = findings.filter((f) => STRUCTURAL_FINDINGS.includes(f.type));
  return {
    bySeverity: by,
    structural: structural.length,
    needsStructuralEngineer: structural.length > 0,
    worst: (['critical', 'high', 'medium', 'low'] as Severity[]).find((s) => by[s] > 0) ?? null,
  };
}

/** A change that touches the structure: a removed/moved room edge on a lower floor, a new floor, or a new opening. */
export interface StructuralFlag {
  roomId: string;
  reason: 'demolition' | 'new_floor' | 'enlarged_room';
}

/**
 * Compares the existing plan with a proposal: rooms are matched by id; anything removed is "demolish", anything
 * added is "new". Every change that can touch the structure is flagged "needs structural engineer + permit".
 */
export function diffRenovation(existing: DesignPlan, proposal: DesignPlan) {
  const before = new Map(existing.rooms.map((r) => [r.id, r]));
  const after = new Map(proposal.rooms.map((r) => [r.id, r]));
  const rooms: PlanRoom[] = [];
  const flags: StructuralFlag[] = [];
  for (const r of existing.rooms) {
    const next = after.get(r.id);
    if (!next) {
      rooms.push({ ...r, state: 'demolish' });
      if (r.type !== 'corridor') flags.push({ roomId: r.id, reason: 'demolition' });
    } else {
      const changed = next.x !== r.x || next.y !== r.y || next.w !== r.w || next.h !== r.h;
      rooms.push({ ...next, state: changed ? 'new' : 'existing' });
      if (changed && area(next) > area(r) + 0.5)
        flags.push({ roomId: r.id, reason: 'enlarged_room' });
    }
  }
  for (const r of proposal.rooms) {
    if (before.has(r.id)) continue;
    rooms.push({ ...r, state: 'new' });
    if (r.floor >= existing.floors) flags.push({ roomId: r.id, reason: 'new_floor' });
  }
  return { rooms, flags };
}

export const RENOVATION_LEVELS = ['refresh', 'partial', 'full'] as const;
export type RenovationLevel = (typeof RENOVATION_LEVELS)[number];

/** Indicative cost per m² of floor area (SAR, min/max) by level: placeholders the office replaces with its rates. */
export const RENOVATION_RATES: Record<RenovationLevel, [number, number]> = {
  refresh: [250, 450],
  partial: [700, 1200],
  full: [1500, 2600],
};
export const RENOVATION_WEEKS_PER_100M2: Record<RenovationLevel, number> = {
  refresh: 2,
  partial: 5,
  full: 10,
};

export function renovationOptions(existing: DesignPlan, findings: Finding[]) {
  const floorArea = existing.rooms.reduce((s, r) => s + area(r), 0);
  const c = conditionSummary(findings);
  return RENOVATION_LEVELS.map((level) => ({
    level,
    min: Math.round(floorArea * RENOVATION_RATES[level][0]),
    max: Math.round(floorArea * RENOVATION_RATES[level][1]),
    weeks: Math.max(2, Math.ceil((floorArea / 100) * RENOVATION_WEEKS_PER_100M2[level])),
    // a refresh cannot fix structural findings; it is shown but flagged
    coversFindings: level !== 'refresh' || !c.needsStructuralEngineer,
    needsPermit: level !== 'refresh',
  }));
}
