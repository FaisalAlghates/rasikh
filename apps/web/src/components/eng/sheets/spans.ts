export type Span = [number, number];

/** Merges overlapping stretches. */
export function merge(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const [a, b] of [...spans].sort((p, q) => p[0] - q[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 0.05) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** What is left of `spans` once `cover` is taken away. */
export function minus(spans: Span[], cover: Span[]): Span[] {
  let out = spans;
  for (const [c0, c1] of cover)
    out = out.flatMap(([a, b]): Span[] => {
      if (c1 <= a || c0 >= b) return [[a, b]];
      const keep: Span[] = [];
      if (c0 > a + 0.05) keep.push([a, c0]);
      if (c1 < b - 0.05) keep.push([c1, b]);
      return keep;
    });
  return out;
}
