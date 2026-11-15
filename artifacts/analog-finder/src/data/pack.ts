/**
 * Data from the Terrestrial_Analog_Data pack (15 Nov 2026), converted by scripts/build-pack-data.mjs.
 * Every number in these JSON files is copied or computed from a file in the pack; none is typed by hand.
 */
import pitsJson from "./pack/lunar-pits.json";
import moonGeologyJson from "./pack/moon-geology.json";
import polarJson from "./pack/polar-context.json";
import imageryJson from "./pack/earth-imagery.json";

const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

// ---- LROC lunar pit atlas ----

export interface MapUnitRef {
  code: string;
  period: string;
  name: string;
  color: string | null;
}

export interface LunarPit {
  name: string;
  host: string;
  lat: number;
  lon: number;
  funnelMaxM: number | null;
  funnelMinM: number | null;
  innerMaxM: number | null;
  innerMinM: number | null;
  depthM: number | null;
  /** The atlas writes some depths as ">N": a lower bound, not a measurement. */
  depthIsLowerBound: boolean;
  unit: MapUnitRef | null;
}

export interface MapUnitInfo {
  name: string;
  period: string;
  description: string | null;
  interpretation: string | null;
  color: string | null;
}

interface PitAtlas {
  source: string;
  sourceTitle: string;
  unitSource: string;
  unitSourceUrl: string;
  nullPolicy: string;
  note: string;
  count: number;
  units: Record<string, MapUnitInfo>;
  pits: LunarPit[];
}

export const PIT_ATLAS = pitsJson as PitAtlas;

/** Coarse setting grouped from the USGS map unit at the pit centre. */
export type PitSetting = "mare" | "crater" | "terra";

export const PIT_SETTINGS: { id: PitSetting; label: string; hint: string; color: string }[] = [
  { id: "mare", label: "Mare plains", hint: "USGS mare units (basaltic plains)", color: "hsl(196 78% 62%)" },
  { id: "crater", label: "Crater deposits", hint: "USGS crater units (rim, wall and floor deposits)", color: "hsl(36 92% 62%)" },
  { id: "terra", label: "Other units", hint: "USGS terra, basin, plains, plateau and Alpes units (Marius Hills sits on a volcanic plateau unit)", color: "hsl(290 40% 72%)" },
];

export function pitSetting(p: LunarPit): PitSetting {
  const name = p.unit?.name ?? "";
  if (/mare/i.test(name)) return "mare";
  if (/crater/i.test(name)) return "crater";
  return "terra";
}

export function findPit(name: string): LunarPit | null {
  return PIT_ATLAS.pits.find((p) => p.name === name) ?? null;
}

export const fmtM = (v: number | null) => (v == null ? "n/a" : `${v.toLocaleString("en-US")} m`);
export const fmtDims = (a: number | null, b: number | null) => (a == null && b == null ? "n/a" : `${a ?? "n/a"} × ${b ?? "n/a"} m`);
export const fmtPitCentre = (p: { lat: number; lon: number }) =>
  `${Math.abs(p.lat)}° ${p.lat < 0 ? "S" : "N"}, ${Math.abs(p.lon)}° ${p.lon < 0 ? "W" : "E"}`;
export const fmtDepth = (p: LunarPit) => (p.depthM == null ? "n/a" : `${p.depthIsLowerBound ? "more than " : ""}${p.depthM} m`);

// ---- USGS unified geologic map at the app's Moon targets ----

interface MoonGeology {
  source: string;
  url: string;
  scale: string;
  note: string;
  targets: Record<string, { lat: number; lon: number; unit: (MapUnitRef & { description: string | null; interpretation: string | null }) | null }>;
}

export const MOON_GEOLOGY = moonGeologyJson as MoonGeology;

/** Map unit at a Moon target; null when the target moved since the JSON was built. */
export function moonUnit(site: { id: string; lat: number; lon: number }) {
  const rec = MOON_GEOLOGY.targets[site.id];
  if (!rec || Math.abs(rec.lat - site.lat) > 1e-6 || Math.abs(rec.lon - site.lon) > 1e-6) return null;
  return rec.unit;
}

// ---- PRP polar thermal model around south-polar targets ----

interface Percentiles {
  p10: number | null;
  median: number | null;
  p90: number | null;
  n: number;
}

export interface PolarContext {
  contextPoint: { lat: number; lon: number };
  radiusKm: number;
  imageFile: string;
  imageRangeKm: number;
  rows: number;
  depthCounts: Record<string, number>;
  mean2cmK: Percentiles;
  maxSurfaceK: Percentiles;
}

interface PolarPack {
  product: string;
  productUrl: string;
  depthClasses: { id: string; label: string; color: string }[];
  limits: string[];
  sites: Record<string, PolarContext>;
}

export const POLAR = polarJson as PolarPack;
export const polarImage = (c: PolarContext) => asset(c.imageFile);

// ---- NASA GIBS context imagery for the Earth catalogue ----

export interface EarthImage {
  file: string;
  layer: string;
  bbox: number[];
  retrievedAt: string;
  requestUrl: string;
  marker: { x: number; y: number } | null;
}

interface ImageryPack {
  source: string;
  note: string;
  sites: Record<string, EarthImage>;
}

export const EARTH_IMAGERY = imageryJson as ImageryPack;
export const earthImageUrl = (img: EarthImage) => asset(img.file);
export const MOON_RELIEF_URL = asset("pack/moon-lola-relief.png");
