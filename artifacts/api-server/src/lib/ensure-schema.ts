import { pool } from "@workspace/db";
import { logger } from "./logger";
import { CLIMATE_SOURCE, ELEVATION_SOURCE } from "./upstream";

/**
 * Creates the tables if they do not exist, so a fresh database (including production)
 * works on first start. Mirrors lib/db/src/schema/*.ts.
 */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS measurements (
      key text PRIMARY KEY,
      lat double precision NOT NULL,
      lon double precision NOT NULL,
      elevation_m double precision NOT NULL,
      relief_m double precision NOT NULL,
      t_mean_c double precision NOT NULL,
      t_min_c double precision NOT NULL,
      t_max_c double precision NOT NULL,
      precip_mm double precision NOT NULL,
      pressure_kpa double precision NOT NULL,
      wind_ms double precision NOT NULL,
      climate_source text NOT NULL,
      elevation_source text NOT NULL,
      fetched_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS grid_cells (
      key text PRIMARY KEY,
      lat double precision NOT NULL,
      lon double precision NOT NULL,
      land boolean NOT NULL,
      centre_elevation_m double precision NOT NULL
    );
    CREATE TABLE IF NOT EXISTS target_values (
      site_id text NOT NULL,
      body text NOT NULL,
      variable text NOT NULL,
      value double precision NOT NULL,
      kind text NOT NULL,
      product text NOT NULL,
      source_url text NOT NULL,
      processed_at timestamptz NOT NULL,
      pixel_size text NOT NULL,
      cleaning_note text NOT NULL,
      samples integer,
      PRIMARY KEY (site_id, variable)
    );
  `);

  // Earlier versions cached 2 m air temperature without a warmest-month column. Those cached rows use a
  // different temperature definition (skin temperature now), so drop them and let them be measured again.
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'measurements' AND column_name = 't_max_c'`,
  );
  if (rows.length === 0) {
    logger.warn("measurements cache uses the old air-temperature definition; clearing it");
    await pool.query(`
      TRUNCATE measurements;
      ALTER TABLE measurements ADD COLUMN t_max_c double precision NOT NULL;
    `);
  }
  // Rows measured under an older climate definition (e.g. extreme monthly minima instead of mean daily minima)
  // are dropped so they are measured again; serving them next to new rows would mix two definitions.
  const stale = await pool.query(`DELETE FROM measurements WHERE climate_source <> $1 OR elevation_source <> $2`, [CLIMATE_SOURCE, ELEVATION_SOURCE]);
  if (stale.rowCount) logger.warn({ rows: stale.rowCount }, "invalidated derived measurement cache with an older climate or relief definition; values will be fetched again");
  logger.info("Tables ready");
}
