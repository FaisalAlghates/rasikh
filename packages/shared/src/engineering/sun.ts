/**
 * Sun position for the sun study (NOAA simplified algorithm, accurate to a fraction of a degree): the 3D view
 * lights the model from the real sun at the plot's coordinates for a chosen date and hour.
 */
export function sunPosition(
  date: Date,
  lat: number,
  lng: number,
): { altitude: number; azimuth: number } {
  const rad = Math.PI / 180;
  const day =
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 0)) /
    86_400_000;
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const g = ((2 * Math.PI) / 365) * (day - 1 + (hours - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const trueSolarMin = hours * 60 + eqTime + 4 * lng;
  const ha = (trueSolarMin / 4 - 180) * rad;
  const phi = lat * rad;
  const cosZen = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(Math.min(1, Math.max(-1, cosZen)));
  const az =
    Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / rad +
    180;
  return { altitude: 90 - zen / rad, azimuth: ((az % 360) + 360) % 360 };
}
