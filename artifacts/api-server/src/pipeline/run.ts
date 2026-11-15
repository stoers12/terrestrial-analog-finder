/**
 * Moon and Mars target pipeline.
 *
 *   pnpm --filter @workspace/api-server run ingest:targets
 *
 * Downloads (by byte range) the raw NASA products, validates and cleans them, extracts the
 * values for every target site and writes src/pipeline/data/targets-snapshot.json. The API server loads that
 * snapshot into the `target_values` table at start-up.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectMcs,
  collectMarsWind,
  marsElevation,
  marsSiteValues,
  MCD_WIND_PRODUCT,
  MCD_WIND_URL,
  MCS_DAYS,
  MCS_RADIUS_KM,
  MCS_STEP_DAYS,
} from "./mars";
import { DIVINER_YEAR, moonTemps, processMoonSite } from "./moon";
import { SHOEMAKER, TARGETS } from "./targets";
import type { DatasetInfo, Snapshot, TargetValue } from "./types";
import { get, validate } from "./validation";

export const PIPELINE_VERSION = 2;

const DATASETS: DatasetInfo[] = [
  {
    name: "LRO LOLA global and polar DEMs",
    body: "Moon",
    role: "Elevation and local relief at every Moon site",
    url: "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/",
    kind: "raw-derived",
    steps: [
      "Read the .lbl label: size, 32-bit float format, unit km, reference radius 1737.4 km",
      "Check the file size equals lines x samples x 4 bytes",
      "Locate the site and its 8 neighbours at 15 km on the map (polar stereographic below 60 S, cylindrical elsewhere)",
      "Read those pixels by HTTP byte range; subtract the reference radius; relief = highest minus lowest",
    ],
  },
  {
    name: "LRO Diviner Level 3 bolometric temperature maps",
    body: "Moon",
    role: "Mean, coldest and warmest surface temperature at every Moon site",
    url: "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gdr_l3/",
    kind: "raw-derived",
    steps: [
      `Read all ${DIVINER_YEAR} day and night maps (29 per product) and check each label and file size`,
      "Mask the missing-data code (-32768); reject values outside 20-450 K; DN x 0.02 = kelvin",
      "Pool every pixel within 15 km of the site, separately for daytime and nighttime maps",
      "Mean = average of day mean and night mean; coldest = coldest 10% of night pixels; warmest = warmest 10% of day pixels",
    ],
  },
  {
    name: "MGS MOLA MEGDR topography (128 pixel/degree)",
    body: "Mars",
    role: "Elevation and local relief at every Mars site; input for derived pressure",
    url: "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/",
    kind: "raw-derived",
    steps: [
      "Pick the tile covering each point; read the label and check the file size",
      "Read the centre and 8 neighbours at 15 km by HTTP byte range (16-bit big-endian metres above the areoid)",
      "Relief = highest minus lowest, the same definition as Earth",
    ],
  },
  {
    name: "MRO Mars Climate Sounder DDR profiles",
    body: "Mars",
    role: "Mean, coldest and warmest surface temperature at every Mars site",
    url: "https://atmos.nmsu.edu/PDS/data/MCSDDRV1/",
    kind: "raw-derived",
    steps: [
      `Download ${MCS_DAYS} days spread over one Mars year (every ${MCS_STEP_DAYS} days), 6 files per day`,
      "Keep records with good geometry and radiance quality flags, standard viewing and a surface-temperature error below 5 K; drop -9999 codes",
      `Pool every profile within ${MCS_RADIUS_KM} km of the site, split into 3 pm and 3 am (MCS sees only those two local times)`,
      "Mean = average of 3 pm and 3 am means; coldest = coldest 10% of 3 am profiles; warmest = warmest 10% of 3 pm profiles",
    ],
  },
  {
    name: "Mars surface pressure model",
    body: "Mars",
    role: "Surface pressure at every Mars site",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    kind: "derived",
    steps: ["P = 0.61 kPa x exp(-h / 11.1 km), h = MOLA elevation", "A model, not a measurement"],
  },
  {
    name: MCD_WIND_PRODUCT,
    body: "Mars",
    role: "Modeled near-surface wind at every Mars site",
    url: MCD_WIND_URL,
    kind: "derived",
    steps: [
      "Query horizontal wind speed at each site, 10 m above the local surface",
      "Use the average-solar climatology scenario and the full 15° solar-longitude by 1-hour local-time grid",
      "Exclude duplicate 360° solar-longitude and 24-hour local-time endpoints; average the remaining 576 model values",
      "MCD is a global climate-model climatology, not a rover measurement or forecast",
    ],
  },
];

async function main() {
  const processedAt = new Date().toISOString();
  const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
  const values: TargetValue[] = [];
  const here = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(here, "../src/pipeline/data");
  const snapshotPath = path.join(outDir, "targets-snapshot.json");
  // --moon-only recomputes every Moon target and keeps the Mars values of the previous run unchanged
  // (with their own processedAt), so adding a lunar target does not re-download a Mars year of MCS files.
  const moonOnly = process.argv.includes("--moon-only");

  log("Moon: LOLA elevation and Diviner temperatures");
  const shoemaker = await moonTemps(SHOEMAKER);
  for (const site of TARGETS.filter((t) => t.body === "moon")) {
    const v = await processMoonSite(site, processedAt);
    values.push(...v);
    log(`  ${site.id}: ${v.filter((x) => x.kind === "raw-derived").map((x) => `${x.variable}=${x.value}`).join(" ")}`);
  }

  const marsSites = TARGETS.filter((t) => t.body === "mars");
  if (moonOnly) {
    const previous = JSON.parse(await readFile(snapshotPath, "utf8")) as Snapshot;
    const kept = previous.values.filter((v) => v.body === "mars");
    for (const s of marsSites) {
      if (!kept.some((v) => v.siteId === s.id)) throw new Error(`--moon-only: the previous snapshot has no Mars values for ${s.id}; run the full pipeline`);
    }
    values.push(...kept);
    log(`Mars: kept ${kept.length} values from the previous run (${previous.processedAt})`);
    await finish(values, shoemaker.coldestC, processedAt, outDir, snapshotPath, log);
    return;
  }

  log("Mars: MOLA elevation");
  const elevations = new Map<string, Awaited<ReturnType<typeof marsElevation>>>();
  for (const s of marsSites) elevations.set(s.id, await marsElevation(s));

  log("Mars: MCS surface temperature (downloads about 700 files)");
  const mcs = await collectMcs(marsSites, log);
  log(`  ${mcs.filesRead} files read, ${mcs.filesMissing} missing, ${mcs.profilesUsable} of ${mcs.profilesRead} profiles usable`);
  for (const s of marsSites) {
    const b = mcs.perSite.get(s.id)!;
    log(`  ${s.id}: ${b.day.length} day and ${b.night.length} night MCS profiles within the search radius`);
  }
  log("Mars: MCD v6.2 model wind climatology");
  const wind = await collectMarsWind(marsSites, log);
  for (const s of marsSites) {
    const v = marsSiteValues(s, elevations.get(s.id)!, mcs, wind, processedAt);
    values.push(...v);
    log(`  ${s.id}: ${v.map((x) => `${x.variable}=${x.value}`).join(" ")}`);
  }

  await finish(values, shoemaker.coldestC, processedAt, outDir, snapshotPath, log);
}

async function finish(
  values: TargetValue[],
  shoemakerColdestC: number,
  processedAt: string,
  outDir: string,
  snapshotPath: string,
  log: (m: string) => void,
) {
  const malapertColdest = get(values, "moon-malapert", "minTempC");
  const validation = validate(values, shoemakerColdestC, malapertColdest);
  validation.forEach((v) => log(`  ok: ${v}`));

  const snapshot: Snapshot = { pipelineVersion: PIPELINE_VERSION, processedAt, values, datasets: DATASETS, validation };
  await mkdir(outDir, { recursive: true });
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 1) + "\n");
  log(`Wrote ${values.length} values to src/pipeline/data/targets-snapshot.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
