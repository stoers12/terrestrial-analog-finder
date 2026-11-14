import type { TargetSiteConfig } from "./types";

/** Moon and Mars targets: only identity and position live here. Every number is computed by the pipeline. */
export const TARGETS: TargetSiteConfig[] = [
  { id: "moon-shackleton", body: "moon", lat: -89.9, lon: 0 },
  { id: "moon-malapert", body: "moon", lat: -85.9, lon: 2.9 },
  { id: "moon-marius", body: "moon", lat: 14.1, lon: -56.7 },
  { id: "moon-tranquillitatis", body: "moon", lat: 8.3, lon: 33.2 },
  { id: "moon-schrodinger", body: "moon", lat: -75, lon: 132.4 },
  { id: "mars-jezero", body: "mars", lat: 18.4, lon: 77.6 },
  { id: "mars-gale", body: "mars", lat: -5.4, lon: 137.8 },
  { id: "mars-oxia", body: "mars", lat: 18.2, lon: -24.6 },
  { id: "mars-arcadia", body: "mars", lat: 47, lon: -176 },
  { id: "mars-arsia", body: "mars", lat: -8.3, lon: -120.1 },
  { id: "mars-mawrth", body: "mars", lat: 22.3, lon: -16.5 },
];

/**
 * Mars wind has no raster source: the rover wind records (MSL REMS, Mars 2020 MEDA) exist only at
 * Gale and Jezero. These typical annual-mean speeds are therefore kept as labelled reference values.
 */
export const MARS_WIND_REFERENCE: Record<string, number> = {
  "mars-jezero": 5,
  "mars-gale": 4,
  "mars-oxia": 5,
  "mars-arcadia": 6,
  "mars-arsia": 4,
  "mars-mawrth": 5,
};

/** Two extra points used only to check the polar map orientation (Shoemaker crater, a known cold trap). */
export const SHOEMAKER = { id: "check-shoemaker", lat: -88.1, lon: 44.9 };
