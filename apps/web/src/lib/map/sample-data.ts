/** SAMPLE DATA ONLY — shown in the UI with a "sample" label. Real portfolio data arrives in Phase 4. */
export interface SampleProperty {
  id: string;
  /** i18n key suffix under `portfolio.sample.<id>` */
  coords: [number, number];
  units: number;
  rentSar: number;
  status: 'ok' | 'warn' | 'late';
  height: number;
}

export const SAMPLE_PROPERTIES: SampleProperty[] = [
  { id: 'p1', coords: [46.6446, 24.8076], units: 12, rentSar: 612000, status: 'ok', height: 28 },
  { id: 'p2', coords: [46.7219, 24.7743], units: 6, rentSar: 288000, status: 'warn', height: 18 },
  { id: 'p3', coords: [46.6851, 24.6877], units: 24, rentSar: 1104000, status: 'ok', height: 40 },
  { id: 'p4', coords: [46.7712, 24.7101], units: 3, rentSar: 126000, status: 'late', height: 12 },
  { id: 'p5', coords: [46.6118, 24.7364], units: 8, rentSar: 376000, status: 'ok', height: 22 },
  { id: 'p6', coords: [46.6932, 24.8311], units: 5, rentSar: 240000, status: 'ok', height: 16 },
];

/** Indicative neighbourhood tiles (sample): value 0..1 drives the layer's opacity. */
export function sampleIndicators() {
  const cells: Array<{ id: string; center: [number, number]; value: number }> = [
    { id: 'n1', center: [46.65, 24.8], value: 0.8 },
    { id: 'n2', center: [46.72, 24.77], value: 0.5 },
    { id: 'n3', center: [46.69, 24.69], value: 0.9 },
    { id: 'n4', center: [46.77, 24.71], value: 0.3 },
    { id: 'n5', center: [46.61, 24.74], value: 0.6 },
  ];
  const d = 0.03;
  return {
    type: 'FeatureCollection' as const,
    features: cells.map((c) => ({
      type: 'Feature' as const,
      properties: { id: c.id, value: c.value },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [c.center[0] - d, c.center[1] - d],
            [c.center[0] + d, c.center[1] - d],
            [c.center[0] + d, c.center[1] + d],
            [c.center[0] - d, c.center[1] + d],
            [c.center[0] - d, c.center[1] - d],
          ],
        ],
      },
    })),
  };
}
