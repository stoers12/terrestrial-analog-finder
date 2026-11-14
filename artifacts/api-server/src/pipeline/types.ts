export type ValueKind = "raw-derived" | "derived" | "reference";

export type Variable = "meanTempC" | "minTempC" | "maxTempC" | "elevationM" | "reliefM" | "pressureKpa" | "windMs";

export const VARIABLES: Variable[] = ["meanTempC", "minTempC", "maxTempC", "elevationM", "reliefM", "pressureKpa", "windMs"];

/** One extracted value with the provenance needed to trace it back to a raw NASA file. */
export interface TargetValue {
  siteId: string;
  body: "moon" | "mars";
  variable: Variable;
  value: number;
  kind: ValueKind;
  /** Product name(s), e.g. "LDEM_60S_240M_FLOAT" */
  product: string;
  /** URL of the raw file (or the directory holding the files, when many were read) */
  sourceUrl: string;
  /** ISO date the pipeline ran */
  processedAt: string;
  /** Pixel size of the raw product, as the product's own label states it */
  pixelSize: string;
  /** What was done to get from raw numbers to this value */
  cleaningNote: string;
  /** Number of raw samples (pixels or profiles) the value is based on; null for reference constants */
  samples: number | null;
}

export interface TargetSiteConfig {
  id: string;
  body: "moon" | "mars";
  lat: number;
  lon: number;
}

export interface DatasetInfo {
  name: string;
  body: "Moon" | "Mars" | "Earth";
  role: string;
  url: string;
  kind: ValueKind;
  steps: string[];
}

export interface Snapshot {
  pipelineVersion: number;
  processedAt: string;
  values: TargetValue[];
  datasets: DatasetInfo[];
  validation: string[];
}
