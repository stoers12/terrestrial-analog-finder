/** Nominal 30 km-wide grid: centre, four cardinal points at 15 km and four corners at sqrt(2)*15 km. */
export function reliefGrid(p: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const phi = p.lat * rad;
  const lambda = p.lon * rad;
  const points = [p];
  for (const north of [-15_000, 0, 15_000]) {
    for (const east of [-15_000, 0, 15_000]) {
      if (!north && !east) continue;
      const distance = Math.hypot(north, east) / 6_371_008.8;
      const bearing = Math.atan2(east, north);
      const lat = Math.asin(Math.sin(phi) * Math.cos(distance) + Math.cos(phi) * Math.sin(distance) * Math.cos(bearing));
      const lon = lambda + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(phi), Math.cos(distance) - Math.sin(phi) * Math.sin(lat));
      points.push({ lat: lat / rad, lon: ((lon / rad + 540) % 360) - 180 });
    }
  }
  return points;
}
