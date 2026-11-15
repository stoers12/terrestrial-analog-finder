import { db, measurementsTable, type Measurement } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { CLIMATE_SOURCE, ELEVATION_SOURCE, fetchElevations, fetchPower } from "./upstream";
import { reliefGrid } from "./relief-grid";

export interface Point {
  lat: number;
  lon: number;
}

export const keyOf = (p: Point) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

export interface MeasureOutcome {
  rows: Map<string, Measurement>;
  failed: { key: string; error: string }[];
}

/**
 * Return cached measurements for the points, fetching and storing any that are missing.
 * Points that cannot be measured are reported in `failed`; nothing is invented for them.
 */
export async function measurePoints(points: Point[]): Promise<MeasureOutcome> {
  const unique = new Map<string, Point>();
  for (const p of points) unique.set(keyOf(p), { lat: Number(p.lat.toFixed(2)), lon: Number(p.lon.toFixed(2)) });
  const keys = [...unique.keys()];

  const rows = new Map<string, Measurement>();
  const failed: MeasureOutcome["failed"] = [];
  if (keys.length === 0) return { rows, failed };

  const cached = await db.select().from(measurementsTable).where(inArray(measurementsTable.key, keys));
  for (const r of cached) rows.set(r.key, r);

  const missing = keys.filter((k) => !rows.has(k)).map((k) => ({ key: k, ...unique.get(k)! }));
  if (missing.length === 0) return { rows, failed };

  // Elevation ring for every missing point in one throttled pass, then climate with limited concurrency.
  const rings = missing.map((m) => reliefGrid(m));
  let elevations: number[] | null = null;
  let elevationError = "";
  try {
    elevations = await fetchElevations(rings.flat());
  } catch (err) {
    elevationError = err instanceof Error ? err.message : String(err);
  }
  if (!elevations) {
    for (const m of missing) failed.push({ key: m.key, error: elevationError });
    return { rows, failed };
  }

  const climates = await pool(missing, 4, (m) => fetchPower(m.lat, m.lon));
  const toInsert: (typeof measurementsTable.$inferInsert)[] = [];
  missing.forEach((m, i) => {
    const c = climates[i];
    if (c.status === "rejected") {
      failed.push({ key: m.key, error: c.reason instanceof Error ? c.reason.message : String(c.reason) });
      return;
    }
    const ring = elevations.slice(i * 9, i * 9 + 9);
    toInsert.push({
      key: m.key,
      lat: m.lat,
      lon: m.lon,
      elevationM: ring[0],
      reliefM: Math.max(...ring) - Math.min(...ring),
      ...c.value,
      climateSource: CLIMATE_SOURCE,
      elevationSource: ELEVATION_SOURCE,
    });
  });
  if (toInsert.length) {
    await db.insert(measurementsTable).values(toInsert).onConflictDoNothing();
    const stored = await db
      .select()
      .from(measurementsTable)
      .where(inArray(measurementsTable.key, toInsert.map((r) => r.key)));
    for (const r of stored) rows.set(r.key, r);
  }
  return { rows, failed };
}
