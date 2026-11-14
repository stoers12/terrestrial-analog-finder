import { MARS_RADIUS_M, cylPixel, offsetPoint, pixelIndex } from "./geo";
import { fetchText, httpGet, openRaster, readPixel, withRetry, type Raster } from "./raster";
import { KELVIN, T_MAX_K, T_MIN_K, mean, round, tailMean } from "./stats";
import type { TargetSiteConfig, TargetValue } from "./types";

const PDS = "https://pds-geosciences.wustl.edu";
const MOLA = `${PDS}/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128`;
const MCS = "https://atmos.nmsu.edu/PDS/data/MCSDDRV1";
export const MCD_WIND_URL = "https://www-mars.lmd.jussieu.fr/mcd_python/";
const MCD_CGI = `${MCD_WIND_URL}cgi-bin/mcdcgi.py`;
const MCD_TXT = `${MCD_WIND_URL}txt/`;
const FACT_SHEET = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html";
export const MCD_WIND_PRODUCT = "Mars Climate Database v6.2 GCM climatology (average solar scenario)";

export const RING_M = 15_000;
/** Reference surface pressure at the areoid and scale height (NASA Mars fact sheet). */
export const P0_KPA = 0.61;
export const SCALE_HEIGHT_KM = 11.1;

export const MCS_START = Date.UTC(2010, 6, 1);
export const MCS_STEP_DAYS = 6;
export const MCS_DAYS = 116;
export const MCS_RADIUS_KM = 250;
const MIN_PROFILES = 30;
const TAIL_FRACTION = 0.1;

function tileUrl(lat: number, lon: number): string {
  const band = lat > 44 ? "88n" : lat > 0 ? "44n" : lat > -44 ? "00n" : "44s";
  const lon360 = ((lon % 360) + 360) % 360;
  const west = String(Math.floor(lon360 / 90) * 90).padStart(3, "0");
  const top = band.slice(0, 2);
  return `${MOLA}/megt${top}${band[2]}${west}hb.img`;
}

const tiles = new Map<string, Promise<Raster>>();
function tile(url: string) {
  if (!tiles.has(url)) tiles.set(url, openRaster(url, { lines: 5632, samples: 11520, kind: "int16be" }));
  return tiles.get(url)!;
}

export interface MarsElevation {
  elevationM: number;
  reliefM: number;
  raster: Raster;
}

/** Elevation (centre pixel) and relief (max - min of the 9 ring samples) from MOLA 128 pixel/degree topography. */
export async function marsElevation(site: TargetSiteConfig): Promise<MarsElevation> {
  const heights: number[] = [];
  let centreRaster: Raster | null = null;
  for (const dy of [0, -1, 1]) {
    for (const dx of [0, -1, 1]) {
      const p = offsetPoint(site.lat, site.lon, dy * RING_M, dx * RING_M, MARS_RADIUS_M);
      const r = await tile(tileUrl(p.lat, p.lon));
      if (!centreRaster) centreRaster = r;
      const px = cylPixel(r, p.lat, p.lon);
      const v = await readPixel(r, pixelIndex(px.col), pixelIndex(px.row));
      if (!Number.isFinite(v)) throw new Error(`${site.id}: MOLA returned a missing value inside the ring`);
      if (v < -9000 || v > 22000) throw new Error(`${site.id}: MOLA height ${v} m is outside the Martian range`);
      heights.push(v);
    }
  }
  return { elevationM: heights[0], reliefM: Math.max(...heights) - Math.min(...heights), raster: centreRaster! };
}

export const pressureFromElevation = (elevationM: number) => P0_KPA * Math.exp(-elevationM / 1000 / SCALE_HEIGHT_KM);

// ---- MRO Mars Climate Sounder (MCS) DDR profile records ----

interface Profile {
  tK: number;
  localHour: number;
}

function volumeFor(date: Date): number {
  return 2001 + (date.getUTCFullYear() - 2006) * 12 + (date.getUTCMonth() - 8);
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function mcsFileUrl(date: Date, hour: number): string {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  return `${MCS}/MROM_${volumeFor(date)}/DATA/${y}/${y}${m}/${y}${m}${d}/${y}${m}${d}${pad(hour)}_DDR.TAB`;
}

interface FileStats {
  rows: number;
  usable: number;
  rejected: number;
  ls: number[];
}

/** Parse one DDR file and hand each good surface-temperature record to `emit`. */
function parseDdr(text: string, emit: (lat: number, lon: number, p: Profile) => void): FileStats {
  let idx: Record<string, number> | null = null;
  const stats: FileStats = { rows: 0, usable: 0, rejected: 0, ls: [] };
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const f = line.split(",").map((x) => x.trim());
    if (f[0] === "1" && f[1] === "Date") {
      idx = {};
      f.forEach((n, i) => (idx![n.toLowerCase()] = i));
      continue;
    }
    if (!idx || !f[1]?.startsWith('"')) continue; // profile sub-rows start with a number, not a quoted date
    stats.rows++;
    const g = (n: string) => {
      const i = idx![n];
      if (i === undefined) throw new Error(`MCS DDR header lacks column ${n}`);
      return Number(f[i]);
    };
    const tSurf = g("t_surf");
    const tErr = g("t_surf_err");
    const lat = g("surf_lat");
    const lon = g("surf_lon");
    const ltst = g("ltst");
    const gq = g("gqual");
    const rq = g("rqual");
    const oq = g("obs_qual");
    // -9999 is the DDR missing-value code.
    if ([tSurf, tErr, lat, lon, ltst].some((v) => v === -9999 || !Number.isFinite(v))) {
      stats.rejected++;
      continue;
    }
    if ((gq !== 0 && gq !== 1) || rq !== 0 || (oq !== 0 && oq !== 10) || tErr < 0 || tErr >= 5 || tSurf < T_MIN_K || tSurf > T_MAX_K) {
      stats.rejected++;
      continue;
    }
    stats.usable++;
    stats.ls.push(g("l_s"));
    emit(lat, lon, { tK: tSurf, localHour: ltst * 24 });
  }
  if (!idx) throw new Error("MCS DDR file has no column header line");
  return stats;
}

const R_KM = MARS_RADIUS_M / 1000;
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface McsResult {
  perSite: Map<string, { day: number[]; night: number[] }>;
  filesRead: number;
  filesMissing: number;
  profilesRead: number;
  profilesUsable: number;
  lsMin: number;
  lsMax: number;
  firstDate: string;
  lastDate: string;
}

/** Download the sampled MCS files and pool the profiles near each Mars site, by local time of day. */
export async function collectMcs(sites: TargetSiteConfig[], log: (msg: string) => void): Promise<McsResult> {
  const perSite = new Map(sites.map((s) => [s.id, { day: [] as number[], night: [] as number[] }]));
  const jobs: { date: Date; hour: number }[] = [];
  for (let i = 0; i < MCS_DAYS; i++) {
    const date = new Date(MCS_START + i * MCS_STEP_DAYS * 86_400_000);
    for (let hour = 0; hour < 24; hour += 4) jobs.push({ date, hour });
  }
  const res: McsResult = { perSite, filesRead: 0, filesMissing: 0, profilesRead: 0, profilesUsable: 0, lsMin: Infinity, lsMax: -Infinity, firstDate: "", lastDate: "" };
  res.firstDate = jobs[0].date.toISOString().slice(0, 10);
  res.lastDate = jobs[jobs.length - 1].date.toISOString().slice(0, 10);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const url = mcsFileUrl(job.date, job.hour);
      const r = await withRetry(`MCS ${url}`, async () => {
        const g = await httpGet(url);
        if (g.status === 404) return null;
        if (g.status !== 200) throw new Error(`HTTP ${g.status}`);
        if (g.body.length < 100_000) throw new Error(`file too small (${g.body.length} bytes)`);
        return g.body.toString("latin1");
      });
      if (!r) {
        res.filesMissing++;
        continue;
      }
      const st = parseDdr(r, (lat, lon, p) => {
        for (const s of sites) {
          if (distanceKm(s.lat, s.lon, lat, lon) > MCS_RADIUS_KM) continue;
          const bucket = perSite.get(s.id)!;
          if (p.localHour >= 6 && p.localHour < 18) bucket.day.push(p.tK);
          else bucket.night.push(p.tK);
        }
      });
      res.filesRead++;
      res.profilesRead += st.rows;
      res.profilesUsable += st.usable;
      for (const l of st.ls) {
        if (l < res.lsMin) res.lsMin = l;
        if (l > res.lsMax) res.lsMax = l;
      }
      if (res.filesRead % 30 === 0) log(`MCS: ${res.filesRead} files read`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  if (res.filesMissing > jobs.length * 0.1) throw new Error(`MCS: ${res.filesMissing} of ${jobs.length} files missing`);
  return res;
}

export interface MarsWindResult {
  perSite: Map<string, { meanMs: number; samples: number }>;
}

function parseMcdWindTable(text: string, siteId: string): { meanMs: number; samples: number } {
  const lines = text.split(/\r?\n/);
  const header = lines.find((line) => /^\s*-+\s*\|\|/.test(line));
  if (!header) throw new Error(`${siteId}: MCD wind response has no local-time header`);
  const hours = header.split("||")[1]?.trim().split(/\s+/).map(Number) ?? [];
  if (hours.length !== 25 || hours.some((hour, i) => hour !== i)) {
    throw new Error(`${siteId}: unexpected MCD local-time grid (${hours.length} columns)`);
  }

  const rows = lines.flatMap((line) => {
    const match = /^\s*\+(\d+)\s*\|\|\s*(.*?)\s*$/.exec(line);
    if (!match) return [];
    const values = match[2].split(/\s+/).map(Number);
    if (values.length !== 25 || values.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error(`${siteId}: invalid MCD wind row at Ls ${match[1]}`);
    }
    return [{ ls: Number(match[1]), values }];
  });
  if (rows.length !== 25 || rows.some((row, i) => row.ls !== i * 15)) {
    throw new Error(`${siteId}: unexpected MCD seasonal grid (${rows.length} rows)`);
  }

  // The 360-degree seasonal and 24-hour local-time entries duplicate the 0-degree/0-hour edges.
  const values = rows.slice(0, 24).flatMap((row) => row.values.slice(0, 24));
  return { meanMs: mean(values), samples: values.length };
}

async function mcdWindAtSite(site: TargetSiteConfig): Promise<{ meanMs: number; samples: number }> {
  const query = new URLSearchParams({
    var1: "wind",
    var2: "none",
    var3: "none",
    var4: "none",
    datekeyhtml: "1",
    ls: "all",
    localtime: "all",
    latitude: String(site.lat),
    longitude: String(((site.lon % 360) + 360) % 360),
    altitude: "10",
    zkey: "3",
    spacecraft: "none",
    isfixedlt: "off",
    dust: "1",
    hrkey: "0",
    averaging: "off",
    animation: "off",
    animframes: "12",
    dpi: "80",
    islog: "off",
    colorm: "jet",
    proj: "cyl",
  });
  const page = await fetchText(`${MCD_CGI}?${query.toString()}`);
  const file = /\.\.\/txt\/([A-Za-z0-9_.-]+\.txt)/.exec(page)?.[1];
  if (!file) throw new Error(`${site.id}: MCD wind request did not return an ASCII data file`);
  const text = await fetchText(`${MCD_TXT}${file}`);
  if (!text.includes("Horizontal wind speed (m/s)") || !text.includes("Altitude 10.0 m ALS")) {
    throw new Error(`${site.id}: MCD wind response is not the requested 10 m wind table`);
  }
  return parseMcdWindTable(text, site.id);
}

/** Query MCD's global GCM climatology at each site and average its seasonal/local-time grid. */
export async function collectMarsWind(sites: TargetSiteConfig[], log: (msg: string) => void): Promise<MarsWindResult> {
  const perSite = new Map<string, { meanMs: number; samples: number }>();
  // Keep requests serial: the MCD web interface is intended for moderate use.
  for (const site of sites) {
    const wind = await withRetry(`MCD wind at ${site.id}`, () => mcdWindAtSite(site));
    perSite.set(site.id, wind);
    log(`  ${site.id}: MCD wind ${wind.meanMs.toFixed(2)} m/s from ${wind.samples} seasonal/local-time samples`);
  }
  return { perSite };
}

export function marsSiteValues(
  site: TargetSiteConfig,
  el: MarsElevation,
  mcs: McsResult,
  wind: MarsWindResult,
  processedAt: string,
): TargetValue[] {
  const b = mcs.perSite.get(site.id)!;
  if (b.day.length < MIN_PROFILES || b.night.length < MIN_PROFILES) {
    throw new Error(`${site.id}: too few MCS profiles (day ${b.day.length}, night ${b.night.length}); need at least ${MIN_PROFILES} each`);
  }
  const windAtSite = wind.perSite.get(site.id);
  if (!windAtSite) throw new Error(`${site.id}: no MCD wind result`);
  const lonEast = ((site.lon % 360) + 360) % 360;
  const base = { siteId: site.id, body: "mars" as const, processedAt };
  const tNote =
    `MRO Mars Climate Sounder DDR profile records, ${MCS_DAYS} days sampled every ${MCS_STEP_DAYS} days from ${mcs.firstDate} to ${mcs.lastDate} (one Mars year, Ls ${mcs.lsMin.toFixed(0)}-${mcs.lsMax.toFixed(0)}); ` +
    `${mcs.filesRead} files read. Kept records with geometry quality 0-1, radiance quality 0, standard forward viewing, surface-temperature error < 5 K, ` +
    `missing code -9999 removed. Pooled every profile whose surface footprint is within ${MCS_RADIUS_KM} km of the site: ${b.day.length} afternoon (local time 6-18 h, about 3 pm), ${b.night.length} night (about 3 am). ` +
    `MCS only observes near 3 am and 3 pm local time.`;
  const tBase = {
    ...base,
    kind: "raw-derived" as const,
    product: "MRO MCS DDR v1 (MROM_xxxx volumes)",
    sourceUrl: MCS,
    pixelSize: "profile footprint, about 170 km along track",
  };
  const elevBase = {
    ...base,
    kind: "raw-derived" as const,
    product: "MGS MOLA MEGDR topography (MEGT, 128 pixel/degree)",
    sourceUrl: el.raster.url,
    pixelSize: el.raster.pixelSize,
  };
  const elevNote = "MOLA median topography in metres relative to the areoid, 16-bit big-endian integers; where no laser shot fell in a bin the product supplies an interpolated value; nearest pixel.";
  const pressure = pressureFromElevation(el.elevationM);
  return [
    { ...tBase, variable: "meanTempC", value: round((mean(b.day) + mean(b.night)) / 2 - KELVIN, 1), cleaningNote: `${tNote} Mean = average of the 3 pm mean and the 3 am mean.`, samples: b.day.length + b.night.length },
    { ...tBase, variable: "minTempC", value: round(tailMean(b.night, TAIL_FRACTION, "low") - KELVIN, 1), cleaningNote: `${tNote} Coldest = mean of the coldest 10% of 3 am profiles.`, samples: b.night.length },
    { ...tBase, variable: "maxTempC", value: round(tailMean(b.day, TAIL_FRACTION, "high") - KELVIN, 1), cleaningNote: `${tNote} Warmest = mean of the warmest 10% of 3 pm profiles.`, samples: b.day.length },
    { ...elevBase, variable: "elevationM", value: Math.round(el.elevationM), cleaningNote: elevNote, samples: 1 },
    {
      ...elevBase,
      variable: "reliefM",
      value: Math.round(el.reliefM),
      cleaningNote: `${elevNote} Relief = highest minus lowest of 9 samples (centre and 8 neighbours at +/-${RING_M / 1000} km), the same definition as the Earth sites.`,
      samples: 9,
    },
    {
      ...base,
      variable: "pressureKpa",
      value: round(pressure, 2),
      kind: "derived",
      product: "Derived from MOLA elevation",
      sourceUrl: FACT_SHEET,
      pixelSize: el.raster.pixelSize,
      cleaningNote: `P = ${P0_KPA} kPa x exp(-h / ${SCALE_HEIGHT_KM} km), with h the MOLA elevation above the areoid. ${P0_KPA} kPa is the mean areoid pressure and ${SCALE_HEIGHT_KM} km the scale height from the NASA Mars fact sheet. A model, not a measurement: it ignores the seasonal swing of about +/-15%.`,
      samples: 1,
    },
    {
      ...base,
      variable: "windMs",
      value: round(windAtSite.meanMs, 2),
      kind: "derived",
      product: MCD_WIND_PRODUCT,
      sourceUrl: MCD_WIND_URL,
      pixelSize: "5.625° longitude x 3.75° latitude model grid, interpolated to site",
      cleaningNote:
        `Mars Climate Database v6.2 global climate model, climatology average-solar scenario. Queried horizontal wind speed at target coordinates (${site.lat}° latitude, ${lonEast}° east longitude) and 10 m above local surface, with high-resolution topography off. ` +
        `Mean of ${windAtSite.samples} model values on the 15° solar-longitude by 1-hour local-time grid (duplicate 360°/24-hour endpoints excluded). Model climatology, not a rover measurement or forecast.`,
      samples: windAtSite.samples,
    },
  ];
}
