import { describe, expect, it } from 'vitest';
import { lightPresetFor, riyadhHour } from './riyadh';

// Riyadh = UTC+3
const at = (utcHour: number, min = 0) => new Date(Date.UTC(2026, 9, 11, utcHour, min));

describe('riyadh light preset', () => {
  it('converts UTC to Riyadh local time', () => {
    expect(riyadhHour(at(21))).toBe(0); // 21:00 UTC = 00:00 Riyadh
    expect(riyadhHour(at(9, 30))).toBeCloseTo(12.5);
  });
  it('follows dawn → day → dusk → night', () => {
    expect(lightPresetFor(at(2, 30))).toBe('dawn'); // 05:30
    expect(lightPresetFor(at(9))).toBe('day'); // 12:00
    expect(lightPresetFor(at(14, 30))).toBe('dusk'); // 17:30
    expect(lightPresetFor(at(19))).toBe('night'); // 22:00
    expect(lightPresetFor(at(0, 30))).toBe('night'); // 03:30
  });
  it('marketing pages can pin dusk', () => {
    expect(lightPresetFor(at(9), 'dusk')).toBe('dusk');
  });
});
