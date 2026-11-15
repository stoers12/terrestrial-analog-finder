import { reliefToRuggedness, type GeologyTag, type Site } from "@/components/mockups/analog-ux/_source/data/sites";

export type DimensionKey =
  | "thermal"
  | "atmosphere"
  | "geology"
  | "terrain"
  | "light"
  | "dust"
  | "isolation";

export interface Dimension {
  key: DimensionKey;
  label: string;
  description: string;
}

export const DIMENSIONS: Dimension[] = [
  {
    key: "thermal",
    label: "Temperature",
    description: "Annual mean and coldest-night temperature",
  },
  {
    key: "atmosphere",
    label: "Air and water",
    description: "Surface pressure and annual precipitation",
  },
  {
    key: "geology",
    label: "Geology",
    description: "Shared rock, landform and resource types",
  },
  {
    key: "terrain",
    label: "Terrain",
    description: "Slope and relief the vehicles must handle",
  },
  {
    key: "light",
    label: "Sun geometry",
    description: "Latitude, which sets how the Sun moves across the sky",
  },
  {
    key: "dust",
    label: "Wind and dust",
    description: "Mean wind speed and aridity, which drive dust lofting and abrasion",
  },
  {
    key: "isolation",
    label: "Isolation",
    description: "Remoteness from infrastructure and rescue",
  },
];

export type Weights = Record<DimensionKey, number>;

export const DEFAULT_WEIGHTS: Weights = {
  thermal: 3,
  atmosphere: 3,
  geology: 5,
  terrain: 2,
  light: 2,
  dust: 2,
  isolation: 1,
};

/** Dimensions that can be measured for any point on Earth, so the global grid can score them. */
export const MEASURABLE_DIMENSIONS: DimensionKey[] = ["thermal", "atmosphere", "terrain", "light", "dust"];

export type DimensionScores = Record<DimensionKey, number>;

export interface Match {
  site: Site;
  /** Weighted overall similarity, 0 to 100 */
  score: number;
  /** Per-dimension similarity, 0 to 1 */
  dimensions: DimensionScores;
  sharedGeology: GeologyTag[];
  missingGeology: GeologyTag[];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function thermalScore(a: Site, b: Site): number {
  const mean = 1 - clamp01(Math.abs(a.meanTempC - b.meanTempC) / 110);
  const min = 1 - clamp01(Math.abs(a.minTempC - b.minTempC) / 140);
  return 0.5 * mean + 0.5 * min;
}

function atmosphereScore(a: Site, b: Site): number {
  // Pressure is compared on a log scale: 0.7 kPa vs 90 kPa is far apart, 85 vs 90 is not.
  const logP = (p: number) => Math.log10(p + 0.05);
  const pressure = 1 - clamp01(Math.abs(logP(a.pressureKpa) - logP(b.pressureKpa)) / 3);
  const logW = (w: number) => Math.log10(w + 5);
  const water = 1 - clamp01(Math.abs(logW(a.precipMm) - logW(b.precipMm)) / 3.2);
  return 0.5 * pressure + 0.5 * water;
}

function geologyScore(a: Site, b: Site): { score: number; shared: GeologyTag[]; missing: GeologyTag[] } {
  const A = new Set(a.geology);
  const B = new Set(b.geology);
  const shared = [...A].filter((t) => B.has(t));
  const missing = [...A].filter((t) => !B.has(t));
  // Reward covering the target's features more than penalising extra Earth features.
  const coverage = A.size === 0 ? 0 : shared.length / A.size;
  const union = new Set([...A, ...B]).size;
  const jaccard = union === 0 ? 0 : shared.length / union;
  return { score: 0.7 * coverage + 0.3 * jaccard, shared, missing };
}

function terrainScore(a: Site, b: Site): number {
  return 1 - clamp01(Math.abs(a.ruggedness - b.ruggedness) / 10);
}

function lightScore(a: Site, b: Site): number {
  return 1 - clamp01(Math.abs(Math.abs(a.lat) - Math.abs(b.lat)) / 90);
}

function dustScore(a: Site, b: Site): number {
  const wind = 1 - clamp01(Math.abs(a.windMs - b.windMs) / 10);
  // Aridity: 1 for no rain at all, falling to 0 at 600 mm/yr.
  const arid = (p: number) => 1 - clamp01(p / 600);
  const dry = 1 - Math.abs(arid(a.precipMm) - arid(b.precipMm));
  return 0.6 * wind + 0.4 * dry;
}

function isolationScore(a: Site, b: Site): number {
  return 1 - clamp01(Math.abs(a.isolation - b.isolation) / 10);
}

export function compareSites(target: Site, earth: Site, weights: Weights): Match {
  const geo = geologyScore(target, earth);
  const dimensions: DimensionScores = {
    thermal: thermalScore(target, earth),
    atmosphere: atmosphereScore(target, earth),
    geology: geo.score,
    terrain: terrainScore(target, earth),
    light: lightScore(target, earth),
    dust: dustScore(target, earth),
    isolation: isolationScore(target, earth),
  };
  let total = 0;
  let weightSum = 0;
  for (const d of DIMENSIONS) {
    total += dimensions[d.key] * weights[d.key];
    weightSum += weights[d.key];
  }
  const score = weightSum === 0 ? 0 : (total / weightSum) * 100;
  return {
    site: earth,
    score,
    dimensions,
    sharedGeology: geo.shared,
    missingGeology: geo.missing,
  };
}

export function rankAnalogs(target: Site, weights: Weights, earthSites: Site[]): Match[] {
  return earthSites
    .map((e) => compareSites(target, e, weights))
    .sort((a, b) => b.score - a.score);
}

export interface GridCellData {
  lat: number;
  lon: number;
  elevationM: number;
  reliefM: number;
  tMeanC: number;
  tMinC: number;
  precipMm: number;
  pressureKpa: number;
  windMs: number;
}

export interface CellMatch {
  cell: GridCellData;
  site: Site;
  /** Weighted similarity over the measurable dimensions only, 0 to 100 */
  score: number;
  /** Per-dimension similarity, 0 to 1, for the measurable dimensions */
  dimensions: Partial<DimensionScores>;
}

export function cellToSite(cell: GridCellData): Site {
  const ns = cell.lat >= 0 ? "N" : "S";
  const ew = cell.lon >= 0 ? "E" : "W";
  return {
    id: `cell-${cell.lat}-${cell.lon}`,
    name: `${Math.abs(cell.lat).toFixed(0)}° ${ns}, ${Math.abs(cell.lon).toFixed(0)}° ${ew}`,
    body: "earth",
    region: "Grid cell centre",
    lat: cell.lat,
    lon: cell.lon,
    meanTempC: Math.round(cell.tMeanC * 10) / 10,
    minTempC: Math.round(cell.tMinC * 10) / 10,
    precipMm: Math.round(cell.precipMm),
    pressureKpa: Math.round(cell.pressureKpa * 10) / 10,
    windMs: Math.round(cell.windMs * 10) / 10,
    geology: [],
    ruggedness: Math.round(reliefToRuggedness(cell.reliefM) * 10) / 10,
    isolation: 0,
    summary: "",
    measured: {
      elevationM: Math.round(cell.elevationM),
      reliefM: Math.round(cell.reliefM),
      climateSource: "",
      elevationSource: "",
      fetchedAt: "",
    },
  };
}

/** Score one grid cell using only what can be measured everywhere (no geology, no isolation). */
export function scoreCell(target: Site, cell: GridCellData, weights: Weights): CellMatch {
  const site = cellToSite(cell);
  const all: Partial<DimensionScores> = {
    thermal: thermalScore(target, site),
    atmosphere: atmosphereScore(target, site),
    terrain: terrainScore(target, site),
    light: lightScore(target, site),
    dust: dustScore(target, site),
  };
  let total = 0;
  let weightSum = 0;
  for (const k of MEASURABLE_DIMENSIONS) {
    total += (all[k] ?? 0) * weights[k];
    weightSum += weights[k];
  }
  return { cell, site, score: weightSum === 0 ? 0 : (total / weightSum) * 100, dimensions: all };
}

/** Great-circle distance in km, used for "how far is the nearest analog from X" style hints. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
