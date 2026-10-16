import type { StructuralScheme } from './disciplines.js';
import type { DesignPlan } from './schemas.js';

/**
 * A preliminary hand calculation behind the structural sheets: unit loads, the load on the biggest column and a
 * footing area. Every input is a starting assumption the structural engineer replaces (the soil's bearing capacity
 * most of all); it is not a design and never marked as one.
 */
export interface CalcAssumptions {
  /** kN/m³. */
  concreteUnitWeight: number;
  /** Floor finishes and partitions, kN/m². */
  floorCovering: number;
  roofCovering: number;
  /** Suspended ceiling and services, kN/m². */
  ceiling: number;
  floorLive: number;
  roofLive: number;
  /** Allowed soil bearing, kPa. */
  soilBearing: number;
}

export const DEFAULT_CALC: CalcAssumptions = {
  concreteUnitWeight: 25,
  floorCovering: 2,
  roofCovering: 3.5,
  ceiling: 0.5,
  floorLive: 2,
  roofLive: 1,
  soilBearing: 150,
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function structuralCalc(
  plan: Pick<DesignPlan, 'floors'>,
  scheme: StructuralScheme,
  a: CalcAssumptions = DEFAULT_CALC,
) {
  const selfWeight = scheme.slabThickness * a.concreteUnitWeight;
  const deadFloor = selfWeight + a.floorCovering + a.ceiling;
  const deadRoof = selfWeight + a.roofCovering + a.ceiling;
  const serviceFloor = deadFloor + a.floorLive;
  const serviceRoof = deadRoof + a.roofLive;
  const factoredFloor = 1.2 * deadFloor + 1.6 * a.floorLive;
  const tributary = scheme.spanX * scheme.spanY;
  const axial = tributary * (Math.max(0, plan.floors - 1) * serviceFloor + serviceRoof);
  return {
    selfWeight: r1(selfWeight),
    serviceFloor: r1(serviceFloor),
    serviceRoof: r1(serviceRoof),
    factoredFloor: r1(factoredFloor),
    tributary: r1(tributary),
    axial: Math.round(axial),
    soilBearing: a.soilBearing,
    footingArea: r1(axial / a.soilBearing),
  };
}
