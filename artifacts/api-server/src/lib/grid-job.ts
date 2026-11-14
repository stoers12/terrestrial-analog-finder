import { db, gridCellsTable, measurementsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "./logger";
import { keyOf, measurePoints } from "./measure";
import { fetchElevations } from "./upstream";

export const CELL_SIZE_DEG = 4;

type Phase = "idle" | "land-mask" | "climate" | "done" | "error";

const state: { phase: Phase; failed: number; error: string | null; started: boolean } = {
  phase: "idle",
  failed: 0,
  error: null,
  started: false,
};

function cellCentres() {
  const out: { lat: number; lon: number }[] = [];
  for (let lat = -90 + CELL_SIZE_DEG / 2; lat < 90; lat += CELL_SIZE_DEG) {
    for (let lon = -180 + CELL_SIZE_DEG / 2; lon < 180; lon += CELL_SIZE_DEG) out.push({ lat, lon });
  }
  return out;
}

export const CELLS_TOTAL = cellCentres().length;

export async function gridStatus() {
  const [{ land }] = await db
    .select({ land: sql<number>`count(*) filter (where ${gridCellsTable.land})::int` })
    .from(gridCellsTable);
  const [{ measured }] = await db
    .select({ measured: sql<number>`count(*)::int` })
    .from(gridCellsTable)
    .innerJoin(measurementsTable, eq(measurementsTable.key, gridCellsTable.key))
    .where(eq(gridCellsTable.land, true));
  return {
    phase: state.phase,
    cellSizeDeg: CELL_SIZE_DEG,
    cellsTotal: CELLS_TOTAL,
    landCells: land,
    measured,
    failed: state.failed,
    error: state.error,
  };
}

export async function gridCells() {
  return db
    .select({
      lat: measurementsTable.lat,
      lon: measurementsTable.lon,
      elevationM: measurementsTable.elevationM,
      reliefM: measurementsTable.reliefM,
      tMeanC: measurementsTable.tMeanC,
      tMinC: measurementsTable.tMinC,
      tMaxC: measurementsTable.tMaxC,
      precipMm: measurementsTable.precipMm,
      pressureKpa: measurementsTable.pressureKpa,
      windMs: measurementsTable.windMs,
    })
    .from(gridCellsTable)
    .innerJoin(measurementsTable, eq(measurementsTable.key, gridCellsTable.key))
    .where(and(eq(gridCellsTable.land, true)));
}

async function run() {
  const centres = cellCentres();

  state.phase = "land-mask";
  const known = new Set((await db.select({ key: gridCellsTable.key }).from(gridCellsTable)).map((r) => r.key));
  const unmasked = centres.filter((c) => !known.has(keyOf(c)));
  if (unmasked.length) {
    logger.info({ cells: unmasked.length }, "grid: building land mask");
    for (let i = 0; i < unmasked.length; i += 500) {
      const part = unmasked.slice(i, i + 500);
      const elev = await fetchElevations(part);
      await db
        .insert(gridCellsTable)
        .values(part.map((c, j) => ({ key: keyOf(c), lat: c.lat, lon: c.lon, land: elev[j] > 0, centreElevationM: elev[j] })))
        .onConflictDoNothing();
    }
  }

  state.phase = "climate";
  for (let pass = 0; pass < 2; pass++) {
    const todo = await db
      .select({ lat: gridCellsTable.lat, lon: gridCellsTable.lon, measuredKey: measurementsTable.key })
      .from(gridCellsTable)
      .leftJoin(measurementsTable, eq(measurementsTable.key, gridCellsTable.key))
      .where(eq(gridCellsTable.land, true));
    const missing = todo.filter((r) => r.measuredKey === null);
    if (missing.length === 0) {
      state.failed = 0;
      break;
    }
    logger.info({ cells: missing.length, pass }, "grid: measuring land cells");
    let failed = 0;
    let lastError = "";
    for (let i = 0; i < missing.length; i += 20) {
      const { failed: f } = await measurePoints(missing.slice(i, i + 20));
      failed += f.length;
      if (f.length) lastError = f[0].error;
      state.failed = failed;
    }
    if (failed) state.error = `${failed} cells could not be measured: ${lastError}`;
    else {
      state.error = null;
      state.failed = 0;
    }
  }
  state.phase = state.failed ? "error" : "done";
  logger.info({ failed: state.failed }, "grid: job finished");
}

/** Start the background job that fills the global grid. Safe to call more than once. */
export function startGridJob() {
  if (state.started) return;
  state.started = true;
  run().catch((err) => {
    state.phase = "error";
    state.error = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "grid: job failed");
  });
}
