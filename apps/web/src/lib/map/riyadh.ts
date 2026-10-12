export type LightPreset = 'dawn' | 'day' | 'dusk' | 'night';

/** Riyadh is UTC+3 all year (no daylight saving). */
export function riyadhHour(date: Date): number {
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + 3;
  return h % 24;
}

/** Map lighting follows Riyadh's real time of day. Marketing pages pass `fixed: 'dusk'`. */
export function lightPresetFor(date: Date, fixed?: LightPreset): LightPreset {
  if (fixed) return fixed;
  const h = riyadhHour(date);
  if (h >= 4.75 && h < 6.75) return 'dawn';
  if (h >= 6.75 && h < 16.75) return 'day';
  if (h >= 16.75 && h < 18.75) return 'dusk';
  return 'night';
}

export const RIYADH_CENTER: [number, number] = [46.6753, 24.7136];
