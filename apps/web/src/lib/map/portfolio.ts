import { buildTwinPlan } from '../scene/twinPlan';
import { approxCoords, cityIdFor } from './kingdom';
import type { MapProperty, MapStatus } from './sample-data';

interface P {
  id: string;
  name: string;
  city?: string;
  district?: string;
  kind?: string;
}
interface U {
  id: string;
  propertyId: string;
  label: string;
}
interface L {
  id: string;
  unitId: string;
  propertyId?: string;
  status?: string;
  endDate?: string;
  annualRent?: number;
  tenantName?: string;
}
interface Pay {
  leaseId: string;
  dueDate: string;
  amount: number;
  status: 'due' | 'paid';
}

/**
 * The owner's own records as map pins: one per property, placed near its city (approximate until an
 * exact pin exists), with its unit count, active annual rent and the worst payment status of its units.
 */
export function portfolioToMap(
  properties: P[],
  units: U[],
  leases: L[],
  payments: Pay[],
  today: string,
): { items: MapProperty[]; unplaced: number } {
  const plan = buildTwinPlan(properties, units, leases, payments, today);
  const items: MapProperty[] = [];
  let unplaced = 0;
  for (const p of properties) {
    const cityId = cityIdFor(p.city);
    if (!cityId) {
      unplaced++;
      continue;
    }
    const cells = plan.buildings.find((b) => b.id === p.id)?.cells ?? [];
    const status: MapStatus = cells.some((c) => c.status === 'late')
      ? 'late'
      : cells.some((c) => c.status === 'soon')
        ? 'warn'
        : 'ok';
    const unitIds = new Set(units.filter((u) => u.propertyId === p.id).map((u) => u.id));
    const rentSar = leases
      .filter(
        (l) =>
          (l.propertyId === p.id || unitIds.has(l.unitId)) &&
          l.status !== 'ended' &&
          (!l.endDate || l.endDate >= today),
      )
      .reduce((s, l) => s + (l.annualRent ?? 0), 0);
    items.push({
      id: p.id,
      name: p.name,
      place: [p.city, p.district].filter(Boolean).join('، '),
      cityId,
      coords: approxCoords(cityId, p.id),
      units: unitIds.size,
      rentSar,
      status,
      approximate: true,
    });
  }
  return { items, unplaced };
}
