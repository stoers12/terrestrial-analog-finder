import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Creates the cache tables if they do not exist, so a fresh database (including production)
 * works on first start. Mirrors lib/db/src/schema/measurements.ts.
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
  `);
  logger.info("Cache tables ready");
}
