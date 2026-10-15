/**
 * Precedent library: the office's own past projects (added only with the client's consent) and any licensed
 * collection the office holds. Rasikh stores references and short summaries, never copied drawings, and every
 * suggestion cites the entries it came from. No training on client data.
 */

export const PRECEDENT_TAGS = [
  'courtyard',
  'najdi',
  'salmani',
  'privacy',
  'hot_arid',
  'narrow_plot',
  'corner_plot',
  'villa',
  'duplex',
  'apartments',
  'roof_annex',
  'basement',
  'pool',
] as const;
export type PrecedentTag = (typeof PRECEDENT_TAGS)[number];

export interface Precedent {
  id: string;
  title: string;
  summary: string;
  tags: PrecedentTag[];
  plotWidth?: number;
  plotDepth?: number;
  /** Where it comes from: an office project (with consent) or a licensed source. */
  source: 'office_project' | 'licensed';
  consent: boolean;
  citation: string;
}

/**
 * Ranks precedents for a brief by shared tags and plot-size similarity. Entries without consent are never returned.
 */
export function findPrecedents(
  library: Precedent[],
  want: { tags: PrecedentTag[]; plotWidth?: number; plotDepth?: number },
  limit = 5,
): Array<Precedent & { score: number }> {
  return library
    .filter((p) => p.consent)
    .map((p) => {
      let score = p.tags.filter((t) => want.tags.includes(t)).length * 10;
      if (want.plotWidth && p.plotWidth)
        score -=
          Math.abs(want.plotWidth - p.plotWidth) +
          Math.abs((want.plotDepth ?? 0) - (p.plotDepth ?? 0)) / 2;
      return { ...p, score: Math.round(score * 10) / 10 };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
