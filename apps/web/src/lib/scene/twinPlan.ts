/**
 * The portfolio "digital twin" plan: the user's own records turned into buildings, floors and lit windows.
 * Pure data (no three.js) so it can be tested and reused by the 2D fallback and the screen-reader list.
 *
 * One building per property; one cell per unit, stacked into floors. Each cell's status comes from the unit's lease
 * and payments: late (a due payment in the past), soon (due within 7 days), ok (leased, nothing pending soon) or
 * vacant (no active lease).
 */

export type CellStatus = 'ok' | 'soon' | 'late' | 'vacant';

export interface TwinCell {
  unitId: string;
  label: string;
  status: CellStatus;
  floor: number;
  col: number;
  tenantName?: string;
  /** Next unpaid installment, if any. */
  nextDue?: { date: string; amount: number };
}

export interface TwinBuilding {
  id: string;
  name: string;
  kind: string;
  /** Ground position (scene units) of the building's centre. */
  x: number;
  z: number;
  cols: number;
  floors: number;
  cells: TwinCell[];
}

export interface TwinPlan {
  buildings: TwinBuilding[];
  counts: Record<CellStatus, number>;
  /** Radius that contains every building (for framing the camera). */
  radius: number;
}

interface PropertyIn {
  id: string;
  name: string;
  kind?: string;
}
interface UnitIn {
  id: string;
  propertyId: string;
  label: string;
}
interface LeaseIn {
  id: string;
  unitId: string;
  status?: string;
  endDate?: string;
  tenantName?: string;
}
interface PaymentIn {
  leaseId: string;
  dueDate: string;
  amount: number;
  status: 'due' | 'paid';
}

export const SOON_DAYS = 7;
const MAX_FLOORS = 10;
const SPACING = 7.5;

const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
};

export function unitStatus(
  unitId: string,
  leases: LeaseIn[],
  payments: PaymentIn[],
  today: string,
): Pick<TwinCell, 'status' | 'tenantName' | 'nextDue'> {
  const lease = leases.find(
    (l) => l.unitId === unitId && l.status !== 'ended' && (!l.endDate || l.endDate >= today),
  );
  if (!lease) return { status: 'vacant' };
  const due = payments
    .filter((p) => p.leaseId === lease.id && p.status === 'due')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const next = due[0];
  const base = {
    ...(lease.tenantName ? { tenantName: lease.tenantName } : {}),
    ...(next ? { nextDue: { date: next.dueDate, amount: next.amount } } : {}),
  };
  if (next && next.dueDate < today) return { status: 'late', ...base };
  if (next && next.dueDate <= addDays(today, SOON_DAYS)) return { status: 'soon', ...base };
  return { status: 'ok', ...base };
}

/** Lays properties out on a gentle spiral so any count from 1 to many reads well from one camera. */
export function layout(n: number): Array<{ x: number; z: number }> {
  if (n === 1) return [{ x: 0, z: 0 }];
  const out: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < n; i++) {
    const r = SPACING * Math.sqrt(i + 0.5) * 0.9;
    const a = i * 2.39996; // golden angle
    out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  return out;
}

export function buildTwinPlan(
  properties: PropertyIn[],
  units: UnitIn[],
  leases: LeaseIn[],
  payments: PaymentIn[],
  today: string,
): TwinPlan {
  const counts: Record<CellStatus, number> = { ok: 0, soon: 0, late: 0, vacant: 0 };
  const pos = layout(properties.length);
  const buildings = properties.map((p, i): TwinBuilding => {
    const own = units
      .filter((u) => u.propertyId === p.id)
      .sort((a, b) => a.label.localeCompare(b.label, 'ar', { numeric: true }));
    const cols = Math.max(1, Math.ceil(own.length / MAX_FLOORS));
    const floors = Math.max(1, Math.ceil(own.length / cols));
    const cells = own.map((u, k): TwinCell => {
      const s = unitStatus(u.id, leases, payments, today);
      counts[s.status]++;
      return { unitId: u.id, label: u.label, floor: Math.floor(k / cols), col: k % cols, ...s };
    });
    return { id: p.id, name: p.name, kind: p.kind ?? 'building', ...pos[i]!, cols, floors, cells };
  });
  const radius = buildings.reduce((r, b) => Math.max(r, Math.hypot(b.x, b.z) + 4), 6);
  return { buildings, counts, radius };
}
