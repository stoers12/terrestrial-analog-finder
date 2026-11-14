import type { Site } from "@/data/sites";
import { distanceKm, scoreCell, type CellMatch, type GridCellData, type Weights } from "@/lib/similarity";

export interface Discovery extends CellMatch {
  nearestSite: Site;
  nearestKm: number;
}

export const cellKey = (c: { lat: number; lon: number }) => `${c.lat},${c.lon}`;

/** Score every measured cell against the target. */
export function scoreGrid(target: Site, cells: GridCellData[], weights: Weights): CellMatch[] {
  return cells.map((c) => scoreCell(target, c, weights)).sort((a, b) => b.score - a.score);
}

export const EXCLUSION_KM = 600;
export const SEPARATION_KM = 1200;

/**
 * Best cells that are not close to any site already in the catalogue. Neighbouring cells of one
 * region are collapsed so the list shows distinct places rather than one desert five times.
 */
export function findDiscoveries(scored: CellMatch[], known: Site[], limit = 8): Discovery[] {
  const out: Discovery[] = [];
  for (const m of scored) {
    let nearest = known[0];
    let nearestKm = Infinity;
    for (const k of known) {
      const d = distanceKm(m.cell, k);
      if (d < nearestKm) {
        nearest = k;
        nearestKm = d;
      }
    }
    if (nearestKm < EXCLUSION_KM) continue;
    if (out.some((o) => distanceKm(o.cell, m.cell) < SEPARATION_KM)) continue;
    out.push({ ...m, nearestSite: nearest, nearestKm });
    if (out.length >= limit) break;
  }
  return out;
}
