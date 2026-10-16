import { describe, expect, it } from 'vitest';
import { parseBrief, confirmProgram } from './brief.js';
import { searchOptions } from './options.js';
import { DESIGN_STYLES, STYLE_TRAITS, styleFit } from './styles.js';
import type { Plot, Zoning } from './schemas.js';

const plot: Plot = {
  width: 22,
  depth: 32,
  streets: { front: 15, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
  landUse: 'residential',
};
const zoning: Zoning = {
  use: 'residential',
  setbacks: { front: 4, back: 2, left: 2, right: 2 },
  coverageMax: 0.6,
  farMax: 1.8,
  maxFloors: 3,
  maxHeightM: 12,
  parkingPerUnit: 1,
};

describe('the four design languages', () => {
  it('reads the style from the client’s words', () => {
    const style = (text: string) => parseBrief(text).style;
    expect(style('فيلا بطراز نجدي')).toBe('modern_najdi');
    expect(style('فيلا حديثة مودرن')).toBe('contemporary');
    expect(style('بيت سويسري بسقف مائل')).toBe('swiss');
    expect(style('فيلا فخمة مثل القصور')).toBe('palace');
  });

  for (const style of DESIGN_STYLES) {
    it(`${style}: more than five different options, each passing every check, fitted to the plot`, () => {
      const program = confirmProgram({ type: 'villa', floors: 2, bedrooms: 4, style }).data!;
      const res = searchOptions(plot, zoning, program, { count: 8 });
      expect(res.options.length).toBeGreaterThanOrEqual(6);
      for (const o of res.options) {
        expect(o.style).toBe(style);
        // inside the plot and its setbacks
        expect(o.footprint.x).toBeGreaterThanOrEqual(zoning.setbacks.left - 0.01);
        expect(o.footprint.x + o.footprint.w).toBeLessThanOrEqual(
          plot.width - zoning.setbacks.right + 0.01,
        );
      }
      // the layout that suits the language is among the first three offered
      const best = Math.max(...res.options.slice(0, 3).map((o) => styleFit(o, style)));
      expect(best).toBeGreaterThanOrEqual(0.5);
    });
  }

  it('a symmetrical palace prefers a centred entrance and core; a Najdi house a courtyard', () => {
    expect(STYLE_TRAITS.palace.symmetric).toBe(true);
    const base = {
      variant: { typology: 'court', entry: 'middle', core: 'center', widthShare: 1 },
    } as never;
    const side = {
      variant: { typology: 'court', entry: 'side', core: 'right', widthShare: 1 },
    } as never;
    expect(styleFit(base, 'palace')).toBeGreaterThan(styleFit(side, 'palace'));
    const court = { variant: { typology: 'court', widthShare: 1 } } as never;
    const terrace = { variant: { typology: 'terrace', widthShare: 1 } } as never;
    expect(styleFit(court, 'modern_najdi')).toBeGreaterThan(styleFit(terrace, 'modern_najdi'));
    expect(styleFit(terrace, 'contemporary')).toBeGreaterThan(styleFit(court, 'contemporary'));
  });
});
