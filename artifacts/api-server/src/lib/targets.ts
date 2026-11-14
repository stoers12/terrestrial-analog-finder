import { db, targetValuesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import snapshotJson from "../pipeline/data/targets-snapshot.json";
import { TARGETS } from "../pipeline/targets";
import { VARIABLES, type Snapshot } from "../pipeline/types";
import { logger } from "./logger";

export const snapshot = snapshotJson as unknown as Snapshot;

/**
 * Load the pipeline output (src/pipeline/data/targets-snapshot.json, produced by `pnpm run ingest:targets`)
 * into the target_values table. Skipped when the table already holds exactly this run.
 */
export async function loadTargets(): Promise<void> {
  const expected = TARGETS.length * VARIABLES.length;
  if (snapshot.values.length !== expected) {
    throw new Error(`Target snapshot has ${snapshot.values.length} values, expected ${expected}. Re-run the pipeline.`);
  }
  const [stat] = await db
    .select({
      n: sql<number>`count(*)::int`,
      first: sql<string | null>`min(${targetValuesTable.processedAt})::text`,
      distinctRuns: sql<number>`count(distinct ${targetValuesTable.processedAt})::int`,
    })
    .from(targetValuesTable);
  if (stat.n === snapshot.values.length && stat.distinctRuns === 1 && stat.first && new Date(stat.first).toISOString() === snapshot.processedAt) {
    logger.info({ processedAt: snapshot.processedAt }, "Target values already loaded");
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(targetValuesTable);
    await tx.insert(targetValuesTable).values(
      snapshot.values.map((v) => ({
        siteId: v.siteId,
        body: v.body,
        variable: v.variable,
        value: v.value,
        kind: v.kind,
        product: v.product,
        sourceUrl: v.sourceUrl,
        processedAt: new Date(v.processedAt),
        pixelSize: v.pixelSize,
        cleaningNote: v.cleaningNote,
        samples: v.samples,
      })),
    );
  });
  logger.info({ rows: snapshot.values.length, processedAt: snapshot.processedAt }, "Target values loaded from pipeline snapshot");
}
