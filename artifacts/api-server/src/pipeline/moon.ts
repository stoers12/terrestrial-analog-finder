import { MOON_RADIUS_M, cylPixel, offsetPoint, pixelIndex, polarPixel } from "./geo";
import { fetchText, openRaster, readPixel, readWindow, type Raster } from "./raster";
import { KELVIN, T_MAX_K, T_MIN_K, mean, round, tailMean } from "./stats";
import type { TargetSiteConfig, TargetValue } from "./types";

const PDS = "https://pds-geosciences.wustl.edu";
const LOLA = `${PDS}/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr`;
const DIVINER = `${PDS}/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gdr_l3`;

/** Ring and temperature window radius, metres. Same ring size as the Earth relief (about 15 km). */
export const RING_M = 15_000;
export const DIVINER_YEAR = 2011;
const MIN_PIXELS = 30;
const TAIL_FRACTION = 0.1;

const isPolar = (lat: number) => lat <= -60;

export const LOLA_POLAR_URL = `${LOLA}/polar/float_img/ldem_60s_240m_float.img`;
export const LOLA_CYL_URL = `${LOLA}/cylindrical/float_img/ldem_128_float.img`;

/** Pixel positions of the centre and its eight neighbours at +/- RING_M, in the map plane (polar) or on the ground (cylindrical). */
function ringPixels(r: Raster, site: TargetSiteConfig, polar: boolean): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  if (polar) {
    const c = polarPixel(r, site.lat, site.lon, MOON_RADIUS_M);
    const d = RING_M / Number(r.label["MAP_SCALE"]);
    for (const dy of [0, -1, 1]) for (const dx of [0, -1, 1]) out.push({ col: c.col + dx * d, row: c.row + dy * d });
  } else {
    for (const dy of [0, -1, 1]) {
      for (const dx of [0, -1, 1]) {
        const p = offsetPoint(site.lat, site.lon, dy * RING_M, dx * RING_M, MOON_RADIUS_M);
        out.push(cylPixel(r, p.lat, p.lon));
      }
    }
  }
  return out;
}

export interface ElevationResult {
  elevationM: number;
  reliefM: number;
  raster: Raster;
}

/** Elevation (centre pixel) and relief (max - min of the 9 ring samples) from the LOLA DEM. */
export async function moonElevation(site: TargetSiteConfig): Promise<ElevationResult> {
  const polar = isPolar(site.lat);
  const raster = polar
    ? await openRaster(LOLA_POLAR_URL, { lines: 7760, samples: 7760, kind: "float32le" })
    : await openRaster(LOLA_CYL_URL, { lines: 23040, samples: 46080, kind: "float32le" });
  const heights: number[] = [];
  for (const p of ringPixels(raster, site, polar)) {
    const v = await readPixel(raster, pixelIndex(p.col), pixelIndex(p.row));
    if (!Number.isFinite(v)) throw new Error(`${site.id}: LOLA returned a missing value inside the ring`);
    // The label's OFFSET turns DN into planetary radius (km); subtract the reference sphere to get height.
    const h = (v - Number(raster.label["OFFSET"])) * 1000;
    if (h < -12_000 || h > 12_000) throw new Error(`${site.id}: LOLA height ${h} m is outside the lunar range`);
    heights.push(h);
  }
  return { elevationM: heights[0], reliefM: Math.max(...heights) - Math.min(...heights), raster };
}

export interface DivinerMap {
  url: string;
  date: string;
  period: "d" | "n";
}

async function listMaps(pole: "s" | "cyl"): Promise<DivinerMap[]> {
  const dir = pole === "cyl" ? `${DIVINER}/${DIVINER_YEAR}/cylindrical/img/` : `${DIVINER}/${DIVINER_YEAR}/polar/img/`;
  const html = await fetchText(dir);
  const re = pole === "cyl" ? /dgdr_tbol_avg_cyl_(\d{8})([dn])_016_img\.img/g : /dgdr_tbol_avg_pols_(\d{8})([dn])_240_img\.img/g;
  const seen = new Map<string, DivinerMap>();
  for (const m of html.matchAll(re)) seen.set(m[0], { url: dir + m[0], date: m[1], period: m[2] as "d" | "n" });
  const maps = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (maps.length < 20) throw new Error(`Diviner ${pole}: only ${maps.length} maps found in ${dir}`);
  if (!maps.some((m) => m.period === "d") || !maps.some((m) => m.period === "n")) throw new Error(`Diviner ${pole}: need both day and night maps`);
  return maps;
}

const mapListCache = new Map<string, Promise<DivinerMap[]>>();
const rasterCache = new Map<string, Promise<Raster>>();

function getMaps(kind: "s" | "cyl") {
  if (!mapListCache.has(kind)) mapListCache.set(kind, listMaps(kind));
  return mapListCache.get(kind)!;
}
function getRaster(url: string, polar: boolean) {
  if (!rasterCache.has(url)) {
    rasterCache.set(url, openRaster(url, polar ? { lines: 3812, samples: 3812, kind: "int16le" } : { lines: 2880, samples: 5760, kind: "int16le" }));
  }
  return rasterCache.get(url)!;
}

export interface MoonTemps {
  meanC: number;
  coldestC: number;
  warmestC: number;
  nDay: number;
  nNight: number;
  mapsDay: number;
  mapsNight: number;
  rejected: number;
  pixelSize: string;
  dirUrl: string;
  firstDate: string;
  lastDate: string;
}

/** Pool every valid Diviner pixel within RING_M of the site, separately for daytime and nighttime maps. */
export async function moonTemps(site: { id: string; lat: number; lon: number }): Promise<MoonTemps> {
  const polar = isPolar(site.lat);
  const maps = await getMaps(polar ? "s" : "cyl");
  const day: number[] = [];
  const night: number[] = [];
  let rejected = 0;
  let pixelSize = "";
  const counts = { d: 0, n: 0 };

  for (const map of maps) {
    const r = await getRaster(map.url, polar);
    pixelSize = r.pixelSize;
    let col0: number, row0: number, w: number, h: number;
    let inside: (c: number, r: number) => boolean;
    if (polar) {
      const c = polarPixel(r, site.lat, site.lon, MOON_RADIUS_M);
      const rad = RING_M / Number(r.label["MAP_SCALE"]);
      col0 = Math.floor(c.col - rad);
      row0 = Math.floor(c.row - rad);
      w = h = Math.ceil(2 * rad) + 2;
      inside = (cc, rr) => (col0 + cc - c.col) ** 2 + (row0 + rr - c.row) ** 2 <= rad * rad;
    } else {
      const c = cylPixel(r, site.lat, site.lon);
      const ppd = Number(r.label["MAP_RESOLUTION"]);
      const degLat = (RING_M / MOON_RADIUS_M) * (180 / Math.PI);
      const degLon = degLat / Math.cos((site.lat * Math.PI) / 180);
      const rLat = degLat * ppd;
      const rLon = degLon * ppd;
      col0 = Math.floor(c.col - rLon);
      row0 = Math.floor(c.row - rLat);
      w = Math.ceil(2 * rLon) + 2;
      h = Math.ceil(2 * rLat) + 2;
      inside = (cc, rr) => ((col0 + cc - c.col) / rLon) ** 2 + ((row0 + rr - c.row) / rLat) ** 2 <= 1;
    }
    const win = await readWindow(r, col0, row0, w, h);
    const target = map.period === "d" ? day : night;
    counts[map.period]++;
    for (let rr = 0; rr < h; rr++) {
      for (let cc = 0; cc < w; cc++) {
        if (!inside(cc, rr)) continue;
        const v = win.data[rr * w + cc];
        if (!Number.isFinite(v)) continue; // missing-data code
        if (v < T_MIN_K || v > T_MAX_K) {
          rejected++;
          continue;
        }
        target.push(v);
      }
    }
  }
  if (day.length < MIN_PIXELS || night.length < MIN_PIXELS) {
    throw new Error(`${site.id}: too few valid Diviner pixels (day ${day.length}, night ${night.length}); need at least ${MIN_PIXELS} each`);
  }
  return {
    meanC: (mean(day) + mean(night)) / 2 - KELVIN,
    coldestC: tailMean(night, TAIL_FRACTION, "low") - KELVIN,
    warmestC: tailMean(day, TAIL_FRACTION, "high") - KELVIN,
    nDay: day.length,
    nNight: night.length,
    mapsDay: counts.d,
    mapsNight: counts.n,
    rejected,
    pixelSize,
    dirUrl: polar ? `${DIVINER}/${DIVINER_YEAR}/polar/img/` : `${DIVINER}/${DIVINER_YEAR}/cylindrical/img/`,
    firstDate: maps[0].date,
    lastDate: maps[maps.length - 1].date,
  };
}

export async function processMoonSite(site: TargetSiteConfig, processedAt: string): Promise<TargetValue[]> {
  const el = await moonElevation(site);
  const t = await moonTemps(site);
  const base = { siteId: site.id, body: "moon" as const, processedAt };
  const polar = isPolar(site.lat);
  const elevNote =
    `LOLA radius (km, 32-bit float, no missing pixels in the ring) minus the 1737.4 km reference sphere, converted to metres; ` +
    `${polar ? "polar-stereographic map position from the label" : "cylindrical map position from the label"}, nearest pixel.`;
  const tNote =
    `Diviner bolometric temperature maps for ${DIVINER_YEAR} (${t.mapsDay} daytime maps, local time 6-18 h; ${t.mapsNight} nighttime maps, 18-6 h). ` +
    `Missing-data code (-32768) masked; values outside ${T_MIN_K}-${T_MAX_K} K rejected (${t.rejected}); DN x 0.02 gives K, then minus 273.15. ` +
    `Pixels pooled within ${RING_M / 1000} km of the site: ${t.nDay} day, ${t.nNight} night.`;
  const tUrl = t.dirUrl;
  const tProduct = `DGDR_TBOL_AVG ${polar ? "polar (POLS)" : "cylindrical"} maps ${t.firstDate}-${t.lastDate}`;
  const tBase = { ...base, kind: "raw-derived" as const, product: tProduct, sourceUrl: tUrl, pixelSize: t.pixelSize };
  return [
    { ...tBase, variable: "meanTempC", value: round(t.meanC, 1), cleaningNote: `${tNote} Mean = average of the daytime-map mean and the nighttime-map mean.`, samples: t.nDay + t.nNight },
    { ...tBase, variable: "minTempC", value: round(t.coldestC, 1), cleaningNote: `${tNote} Coldest = mean of the coldest 10% of nighttime pixels.`, samples: t.nNight },
    { ...tBase, variable: "maxTempC", value: round(t.warmestC, 1), cleaningNote: `${tNote} Warmest = mean of the warmest 10% of daytime pixels.`, samples: t.nDay },
    {
      ...base,
      variable: "elevationM",
      value: Math.round(el.elevationM),
      kind: "raw-derived",
      product: el.raster.product,
      sourceUrl: el.raster.url,
      pixelSize: el.raster.pixelSize,
      cleaningNote: elevNote,
      samples: 1,
    },
    {
      ...base,
      variable: "reliefM",
      value: Math.round(el.reliefM),
      kind: "raw-derived",
      product: el.raster.product,
      sourceUrl: el.raster.url,
      pixelSize: el.raster.pixelSize,
      cleaningNote: `${elevNote} Relief = highest minus lowest of 9 samples (centre and 8 neighbours at +/-${RING_M / 1000} km), the same definition as the Earth sites.`,
      samples: 9,
    },
    {
      ...base,
      variable: "pressureKpa",
      value: 0,
      kind: "reference",
      product: "No atmosphere",
      sourceUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
      pixelSize: "n/a",
      cleaningNote: "The lunar surface pressure (about 3e-10 Pa) is treated as 0 kPa. Constant, not computed from a raster.",
      samples: null,
    },
    {
      ...base,
      variable: "windMs",
      value: 0,
      kind: "reference",
      product: "No atmosphere",
      sourceUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
      pixelSize: "n/a",
      cleaningNote: "No atmosphere, so no wind. Constant, not computed from a raster.",
      samples: null,
    },
  ];
}
