import { pgTable, text, doublePrecision, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * One extracted Moon or Mars value with the provenance needed to trace it to a raw NASA file.
 * Filled by the pipeline in artifacts/api-server/src/pipeline.
 */
export const targetValuesTable = pgTable(
  "target_values",
  {
    siteId: text("site_id").notNull(),
    body: text("body").notNull(),
    variable: text("variable").notNull(),
    value: doublePrecision("value").notNull(),
    /** raw-derived | derived | reference */
    kind: text("kind").notNull(),
    product: text("product").notNull(),
    sourceUrl: text("source_url").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
    pixelSize: text("pixel_size").notNull(),
    cleaningNote: text("cleaning_note").notNull(),
    samples: integer("samples"),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.variable] })],
);

export type TargetValueRow = typeof targetValuesTable.$inferSelect;
