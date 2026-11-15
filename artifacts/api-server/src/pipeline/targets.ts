import type { TargetSiteConfig } from "./types";

/** Moon and Mars targets: only identity and position live here. Every number is computed by the pipeline. */
export const TARGETS: TargetSiteConfig[] = [
  { id: "moon-shackleton", body: "moon", lat: -89.9, lon: 0 },
  { id: "moon-malapert", body: "moon", lat: -85.9, lon: 2.9 },
  { id: "moon-marius", body: "moon", lat: 14.1, lon: -56.7 },
  { id: "moon-tranquillitatis", body: "moon", lat: 8.3, lon: 33.2 },
  { id: "moon-schrodinger", body: "moon", lat: -75, lon: 132.4 },
  // Pit centres from the LROC lunar pit atlas (https://www.lroc.asu.edu/atlases/pits/list),
  // longitudes converted from 0-360 east to -180..180.
  { id: "moon-ingenii", body: "moon", lat: -35.9494, lon: 166.0559 },
  { id: "moon-lacus-mortis", body: "moon", lat: 44.9608, lon: 25.6119 },
  { id: "moon-insularum", body: "moon", lat: 8.6861, lon: -29.0335 },
  { id: "moon-moscoviense", body: "moon", lat: 29.5025, lon: 150.4647 },
  { id: "moon-fecunditatis", body: "moon", lat: -0.9182, lon: 48.6595 },
  { id: "moon-procellarum-north", body: "moon", lat: 35.4097, lon: -45.6398 },
  { id: "moon-copernicus-lb4", body: "moon", lat: 10.2041, lon: -20.0015 },
  { id: "mars-jezero", body: "mars", lat: 18.4, lon: 77.6 },
  { id: "mars-gale", body: "mars", lat: -5.4, lon: 137.8 },
  { id: "mars-oxia", body: "mars", lat: 18.2, lon: -24.6 },
  { id: "mars-arcadia", body: "mars", lat: 47, lon: -176 },
  { id: "mars-arsia", body: "mars", lat: -8.3, lon: -120.1 },
  { id: "mars-mawrth", body: "mars", lat: 22.3, lon: -16.5 },
];

/** Two extra points used only to check the polar map orientation (Shoemaker crater, a known cold trap). */
export const SHOEMAKER = { id: "check-shoemaker", lat: -88.1, lon: 44.9 };
