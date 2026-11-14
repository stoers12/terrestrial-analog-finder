import { pgTable, text, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";

/** Cached NASA POWER climatology and DEM elevation for one point. Key is "lat,lon" rounded to 2 decimals. */
export const measurementsTable = pgTable("measurements", {
  key: text("key").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  elevationM: doublePrecision("elevation_m").notNull(),
  reliefM: doublePrecision("relief_m").notNull(),
  tMeanC: doublePrecision("t_mean_c").notNull(),
  tMinC: doublePrecision("t_min_c").notNull(),
  precipMm: doublePrecision("precip_mm").notNull(),
  pressureKpa: doublePrecision("pressure_kpa").notNull(),
  windMs: doublePrecision("wind_ms").notNull(),
  climateSource: text("climate_source").notNull(),
  elevationSource: text("elevation_source").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Land mask for the global grid: one row per grid cell centre. */
export const gridCellsTable = pgTable("grid_cells", {
  key: text("key").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  land: boolean("land").notNull(),
  centreElevationM: doublePrecision("centre_elevation_m").notNull(),
});

export type Measurement = typeof measurementsTable.$inferSelect;
export type GridCellRow = typeof gridCellsTable.$inferSelect;
