#!/usr/bin/env node
/**
 * Turns the Terrestrial_Analog_Data pack (15 Nov 2026) into the small files the web app loads.
 *
 *   node artifacts/analog-finder/scripts/build-pack-data.mjs <path-to>/Terrestrial_Analog_Data
 *
 * Every number written here is copied or computed from a file in the pack; nothing is typed by hand.
 * The large raw files stay outside git. Outputs:
 *   src/data/pack/lunar-pits.json       LROC pit atlas rows + USGS map unit at each pit centre
 *   src/data/pack/moon-geology.json     USGS map unit at each Moon target used by the app
 *   src/data/pack/polar-context.json    PRP modelled ice-stability / 2 cm temperature summaries
 *   src/data/pack/earth-imagery.json    NASA GIBS context image index for the Earth catalogue
 *   public/pack/moon-lola-relief.png    shaded relief from LOLA LDEM_4 (4 px/deg)
 *   public/pack/polar-*.png             PRP rows plotted by modelled ice-stability depth class
 *   public/pack/earth/*.jpg             the GIBS context images
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const PACK = process.argv[2];
if (!PACK) {
  console.error("usage: build-pack-data.mjs <path-to>/Terrestrial_Analog_Data");
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, "..");
const ROOT = path.resolve(APP, "../..");
const OUT_DATA = path.join(APP, "src/data/pack");
const OUT_PUBLIC = path.join(APP, "public/pack");
mkdirSync(OUT_DATA, { recursive: true });
mkdirSync(path.join(OUT_PUBLIC, "earth"), { recursive: true });

const p = (...a) => path.join(PACK, ...a);
const readJson = (...a) => JSON.parse(readFileSync(p(...a), "utf8"));
const writeJson = (name, obj) => writeFileSync(path.join(OUT_DATA, name), JSON.stringify(obj, null, 1) + "\n");
const MOON_R = 1737400;

// ---------------------------------------------------------------- PNG writer
function png(width, height, channels, pixels) {
  const colorType = { 1: 0, 3: 2, 4: 6 }[channels];
  const rowLen = width * channels;
  const raw = Buffer.alloc((rowLen + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowLen + 1)] = 0;
    pixels.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- USGS unified geologic map of the Moon
function loadGeoUnits() {
  const dir = p("raw/moon/geology");
  const dbf = readFileSync(path.join(dir, "GeoUnits.dbf"));
  const nRec = dbf.readUInt32LE(4);
  const headerLen = dbf.readUInt16LE(8);
  const recLen = dbf.readUInt16LE(10);
  const fields = [];
  for (let off = 32; dbf[off] !== 0x0d; off += 32) {
    fields.push({ name: dbf.toString("latin1", off, off + 11).replace(/\0.*$/, ""), len: dbf[off + 16] });
  }
  const attrs = [];
  for (let i = 0; i < nRec; i++) {
    let off = headerLen + i * recLen + 1;
    const rec = {};
    for (const f of fields) {
      rec[f.name] = dbf.toString("latin1", off, off + f.len).trim();
      off += f.len;
    }
    attrs.push({ unit: rec.FIRST_Unit, period: rec.FIRST_Un_1, unitName: rec.FIRST_Un_2 });
  }

  const shp = readFileSync(path.join(dir, "GeoUnits.shp"));
  const polys = [];
  let off = 100;
  while (off < shp.length) {
    const contentLen = shp.readUInt32BE(off + 4) * 2;
    const c = off + 8;
    const type = shp.readInt32LE(c);
    if (type === 5) {
      const bbox = [shp.readDoubleLE(c + 4), shp.readDoubleLE(c + 12), shp.readDoubleLE(c + 20), shp.readDoubleLE(c + 28)];
      const nParts = shp.readInt32LE(c + 36);
      const nPoints = shp.readInt32LE(c + 40);
      const parts = [];
      for (let i = 0; i < nParts; i++) parts.push(shp.readInt32LE(c + 44 + 4 * i));
      const ptsOff = c + 44 + 4 * nParts;
      polys.push({ bbox, parts, nPoints, ptsOff });
    } else {
      polys.push(null);
    }
    off = c + contentLen;
  }
  if (polys.length !== attrs.length) throw new Error(`GeoUnits: ${polys.length} shapes vs ${attrs.length} attribute rows`);

  const legend = new Map();
  const csv = readFileSync(path.join(dir, "Unified_Geologic_Map_of_the_Moon_DOMU_descriptions.csv"), "utf8");
  for (const line of csv.split(/\r?\n/).slice(1)) {
    const cols = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
    if (cols.length >= 4) legend.set(cols[0], { name: cols[1], description: cols[2], interpretation: cols[3] === "n/a" ? null : cols[3] });
  }
  const colors = new Map();
  for (const line of readFileSync(path.join(dir, "GeologyUnit_colors.csv"), "utf8").split(/\r?\n/).slice(1)) {
    const [u, hex] = line.split(",");
    if (u && hex) colors.set(u, hex);
  }

  /** Map unit containing (lat, lon); coordinates are Moon2000 equidistant cylindrical metres, central meridian 0. */
  function unitAt(lat, lon) {
    const x = (lon * Math.PI * MOON_R) / 180;
    const y = (lat * Math.PI * MOON_R) / 180;
    const hits = [];
    for (let i = 0; i < polys.length; i++) {
      const g = polys[i];
      if (!g || x < g.bbox[0] || x > g.bbox[2] || y < g.bbox[1] || y > g.bbox[3]) continue;
      let inside = false;
      for (let k = 0; k < g.parts.length; k++) {
        const s = g.parts[k];
        const e = k + 1 < g.parts.length ? g.parts[k + 1] : g.nPoints;
        for (let a = s, b = e - 1; a < e; b = a++) {
          const xa = shp.readDoubleLE(g.ptsOff + 16 * a);
          const ya = shp.readDoubleLE(g.ptsOff + 16 * a + 8);
          const xb = shp.readDoubleLE(g.ptsOff + 16 * b);
          const yb = shp.readDoubleLE(g.ptsOff + 16 * b + 8);
          if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
        }
      }
      if (inside) hits.push(i);
    }
    if (hits.length === 0) return null;
    // Craters are separate polygons on top of the plains they sit on; report the smallest containing polygon.
    hits.sort((a, b) => (polys[a].bbox[2] - polys[a].bbox[0]) * (polys[a].bbox[3] - polys[a].bbox[1]) - (polys[b].bbox[2] - polys[b].bbox[0]) * (polys[b].bbox[3] - polys[b].bbox[1]));
    const a = attrs[hits[0]];
    const l = legend.get(a.unit);
    return {
      code: a.unit,
      period: a.period,
      unitName: a.unitName,
      legendName: l?.name ?? null,
      description: l?.description ?? null,
      interpretation: l?.interpretation ?? null,
      color: colors.get(a.unit) ?? null,
      containing: hits.length,
    };
  }
  return { unitAt, count: polys.length };
}

// ---------------------------------------------------------------- Lunar pits (LROC atlas)
function num(s) {
  if (s == null || s === "" || s === "N/A") return null;
  const v = Number(String(s).replace(/^>/, ""));
  return Number.isFinite(v) ? v : null;
}

function buildPits(geo) {
  const t = readJson("processed/lroc-pit-atlas-table.json");
  const [header, ...rows] = t.rows;
  const idx = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`LROC table: no column ${name}`);
    return i;
  };
  const C = {
    host: idx("Host Feat."),
    name: idx("Name"),
    lat: idx("Lat."),
    lon: idx("Long."),
    fMax: idx("Funnel Max Diam. (m)"),
    fMin: idx("Funnel Min Diam. (m)"),
    iMax: idx("Inner Max Diam. (m)"),
    iMin: idx("Inner Min Diam. (m)"),
    depth: idx("Depth (m)"),
  };
  const pits = rows.map((r) => {
    const lon360 = Number(r[C.lon]);
    const lon = ((lon360 + 180) % 360) - 180;
    const lat = Number(r[C.lat]);
    const depthRaw = r[C.depth];
    const unit = geo.unitAt(lat, lon);
    return {
      name: r[C.name],
      host: r[C.host],
      lat,
      lon: Math.round(lon * 10000) / 10000,
      funnelMaxM: num(r[C.fMax]),
      funnelMinM: num(r[C.fMin]),
      innerMaxM: num(r[C.iMax]),
      innerMinM: num(r[C.iMin]),
      depthM: num(depthRaw),
      depthIsLowerBound: String(depthRaw).startsWith(">"),
      unit: unit && { code: unit.code, period: unit.period, name: unit.legendName ?? unit.unitName, color: unit.color },
    };
  });
  const units = {};
  for (const pit of pits) {
    if (!pit.unit) continue;
    const u = geo.unitAt(pit.lat, pit.lon);
    units[u.code] ??= { name: u.legendName ?? u.unitName, period: u.period, description: u.description, interpretation: u.interpretation, color: u.color };
  }
  return {
    source: t.source,
    sourceTitle: "LROC Lunar Pit Atlas (Arizona State University)",
    unitSource: "USGS Unified Geologic Map of the Moon, 1:5,000,000 (Fortezzo, Spudis and Harrel 2020)",
    unitSourceUrl: "https://astrogeology.usgs.gov/search/map/Moon/Geology/Unified_Geologic_Map_of_the_Moon",
    nullPolicy: t.null_policy,
    note: "Longitudes converted from 0-360 east to -180..180. Depths written as '>N' in the atlas are lower bounds, not measurements. The map unit is the smallest USGS polygon containing the pit centre; at 1:5M scale it describes the surrounding terrain, not the pit.",
    count: pits.length,
    units,
    pits,
  };
}

// ---------------------------------------------------------------- Moon targets used by the app
function moonTargets() {
  const src = readFileSync(path.join(ROOT, "artifacts/api-server/src/pipeline/targets.ts"), "utf8");
  return [...src.matchAll(/\{ id: "(moon-[^"]+)", body: "moon", lat: (-?[\d.]+), lon: (-?[\d.]+) \}/g)].map((m) => ({ id: m[1], lat: Number(m[2]), lon: Number(m[3]) }));
}

function buildMoonGeology(geo) {
  const out = {};
  for (const t of moonTargets()) {
    const u = geo.unitAt(t.lat, t.lon);
    out[t.id] = { lat: t.lat, lon: t.lon, unit: u && { code: u.code, period: u.period, name: u.legendName ?? u.unitName, description: u.description, interpretation: u.interpretation, color: u.color } };
  }
  return {
    source: "USGS Unified Geologic Map of the Moon, 1:5,000,000 (Fortezzo, Spudis and Harrel 2020)",
    url: "https://astrogeology.usgs.gov/search/map/Moon/Geology/Unified_Geologic_Map_of_the_Moon",
    scale: "1:5,000,000",
    note: "Map unit of the smallest polygon containing the app's target coordinates. Regional context; it does not resolve pits, caves, ice or the exact landing area.",
    targets: out,
  };
}

// ---------------------------------------------------------------- LOLA shaded relief
function buildMoonRelief() {
  const buf = readFileSync(p("raw/moon/lola/ldem_4.img"));
  const H = 720;
  const W = 1440;
  if (buf.length !== H * W * 2) throw new Error(`ldem_4.img: ${buf.length} bytes, expected ${H * W * 2}`);
  // Source columns start at 0° E; re-centre on 0° so the image spans -180..180.
  const elev = new Float32Array(H * W);
  let lo = Infinity;
  let hi = -Infinity;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const src = r * W + ((c + W / 2) % W);
      const h = buf.readInt16LE(src * 2) * 0.5;
      elev[r * W + c] = h;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  const out = Buffer.alloc(H * W);
  const dy = (Math.PI * MOON_R) / H;
  const az = (315 * Math.PI) / 180;
  const alt = (40 * Math.PI) / 180;
  const Z = 6; // vertical exaggeration for a 7.6 km pixel
  for (let r = 0; r < H; r++) {
    const lat = 90 - (r + 0.5) / 4;
    const dx = Math.max(500, ((2 * Math.PI * MOON_R) / W) * Math.cos((lat * Math.PI) / 180));
    for (let c = 0; c < W; c++) {
      const e = (rr, cc) => elev[Math.min(H - 1, Math.max(0, rr)) * W + ((cc + W) % W)];
      const dzdx = ((e(r, c + 1) - e(r, c - 1)) / (2 * dx)) * Z;
      const dzdy = ((e(r - 1, c) - e(r + 1, c)) / (2 * dy)) * Z;
      const slope = Math.atan(Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.max(0, Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - aspect));
      const tint = (elev[r * W + c] - lo) / (hi - lo);
      const v = Math.min(1, Math.max(0, 0.02 + 0.62 * shade + 0.55 * tint - 0.12));
      out[r * W + c] = Math.round(255 * Math.pow(v, 1.15));
    }
  }
  writeFileSync(path.join(OUT_PUBLIC, "moon-lola-relief.png"), png(W, H, 1, out));
  return { minM: lo, maxM: hi };
}

// ---------------------------------------------------------------- PRP polar context
const DEPTH_CLASSES = [
  { id: "surface", label: "Stable at the surface (0 m)", color: [125, 232, 255] },
  { id: "shallow", label: "Above 0.5 m", color: [56, 163, 214] },
  { id: "mid", label: "0.5 to 1 m", color: [44, 98, 186] },
  { id: "deep", label: "1 to 2.87 m", color: [62, 52, 140] },
  { id: "excluded", label: "No modelled depth (provider code -999)", color: [96, 96, 104] },
  { id: "undocumented", label: "Undocumented code -1 (not interpreted)", color: [214, 150, 92] },
];

function depthClass(f) {
  const q = f.properties.ice_depth_quality;
  if (q === "undocumented_negative_value_requires_source_review") return "undocumented";
  if (q !== "valid_model_value") return "excluded";
  const d = f.properties.modeled_ice_stability_depth_m;
  if (d === 0) return "surface";
  if (d <= 0.5) return "shallow";
  if (d <= 1) return "mid";
  return "deep";
}

function percentile(sorted, q) {
  if (sorted.length === 0) return null;
  const i = (sorted.length - 1) * q;
  const a = Math.floor(i);
  const b = Math.ceil(i);
  return Math.round((sorted[a] + (sorted[b] - sorted[a]) * (i - a)) * 10) / 10;
}

function buildPolarContext() {
  const g = readJson("processed/moon-polar-resource-context.geojson");
  const ctx = readJson("processed/moon-geology-context.json");
  const centres = Object.fromEntries(ctx.targets.map((t) => [t.id, { lat: t.lat, lon: t.lon }]));
  const notes = readJson("docs/polar-resource-quality-notes.json");
  const appIds = { shackleton: "moon-shackleton", malapert: "moon-malapert" };
  const out = {};
  for (const seed of Object.keys(appIds)) {
    const feats = g.features.filter((f) => f.properties.context_seed_ids.includes(seed));
    if (feats.length === 0) throw new Error(`PRP: no rows for ${seed}`);
    const counts = Object.fromEntries(DEPTH_CLASSES.map((c) => [c.id, 0]));
    const t2 = [];
    const tmax = [];
    for (const f of feats) {
      counts[depthClass(f)]++;
      if (Number.isFinite(f.properties.annual_mean_2cm_depth_k)) t2.push(f.properties.annual_mean_2cm_depth_k);
      if (Number.isFinite(f.properties.annual_maximum_surface_k)) tmax.push(f.properties.annual_maximum_surface_k);
    }
    t2.sort((a, b) => a - b);
    tmax.sort((a, b) => a - b);

    // Plot every row in a south-polar stereographic frame centred on the context point.
    const c = centres[seed];
    const proj = (lat, lon) => {
      const k = (2 * MOON_R * Math.tan(((90 + lat) * Math.PI) / 360)) / 1000;
      const a = (lon * Math.PI) / 180;
      return [k * Math.sin(a), k * Math.cos(a)];
    };
    const [cx, cy] = proj(c.lat, c.lon);
    const S = 360;
    const RANGE = 27; // km from the centre to the image edge
    const img = Buffer.alloc(S * S * 4);
    const order = ["excluded", "deep", "mid", "shallow", "surface", "undocumented"];
    const sorted = [...feats].sort((a, b) => order.indexOf(depthClass(a)) - order.indexOf(depthClass(b)));
    for (const f of sorted) {
      const [lon, lat] = f.geometry.coordinates;
      const [x, y] = proj(lat, lon);
      const px = Math.round(((x - cx) / RANGE + 1) * (S / 2));
      const py = Math.round(((y - cy) / RANGE + 1) * (S / 2));
      const col = DEPTH_CLASSES.find((d) => d.id === depthClass(f)).color;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const X = px + ox;
          const Y = py + oy;
          if (X < 0 || Y < 0 || X >= S || Y >= S) continue;
          const o = (Y * S + X) * 4;
          img[o] = col[0];
          img[o + 1] = col[1];
          img[o + 2] = col[2];
          img[o + 3] = 255;
        }
      }
    }
    const file = `polar-${seed}.png`;
    writeFileSync(path.join(OUT_PUBLIC, file), png(S, S, 4, img));
    out[appIds[seed]] = {
      contextPoint: c,
      radiusKm: 25,
      imageFile: `pack/${file}`,
      imageRangeKm: RANGE,
      rows: feats.length,
      depthCounts: counts,
      mean2cmK: { p10: percentile(t2, 0.1), median: percentile(t2, 0.5), p90: percentile(t2, 0.9), n: t2.length },
      maxSurfaceK: { p10: percentile(tmax, 0.1), median: percentile(tmax, 0.5), p90: percentile(tmax, 0.9), n: tmax.length },
    };
  }
  return {
    product: notes.source_product,
    productUrl: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm",
    depthClasses: DEPTH_CLASSES.map(({ id, label, color }) => ({ id, label, color: `rgb(${color.join(",")})` })),
    limits: [
      "Modelled ice stability is not a detection or proof of available water ice.",
      "The 2 cm temperature is an annual mean below the surface; it is not the surface skin temperature used elsewhere in the app.",
      "Each 25 km circle mixes sunlit rims and shadowed ground. These are distributions, not a base-site temperature.",
      "The circles are centred on the pack's representative points, not on a surveyed base site.",
      notes.issue,
    ],
    sites: out,
  };
}

// ---------------------------------------------------------------- Earth context imagery
const EARTH_IDS = {
  askja: "earth-askja",
  "atacama-yungay": "earth-atacama",
  bockfjorden: "earth-svalbard",
  "craters-of-the-moon": "earth-craters-moon",
  "cueva-de-los-verdes": "earth-lanzarote",
  dallol: "earth-danakil",
  "dasht-e-lut": "earth-lut",
  "death-valley": "earth-deathvalley",
  "el-pinacate": "earth-pinacate",
  "haughton-crater": "earth-haughton",
  "kilauea-mauna-ulu": "earth-kilauea",
  "mcmurdo-dry-valleys": "earth-drivalleys",
  "meteor-crater": "earth-meteor",
  qaidam: "earth-qaidam",
  "rio-tinto": "earth-riotinto",
  "salar-de-uyuni": "earth-uyuni",
  samail: "earth-oman",
  teide: "earth-teide",
  tibesti: "earth-tibesti",
  "tso-kar": "earth-ladakh",
  "wadi-rum": "earth-wadirum",
};

function buildEarthImagery() {
  const seeds = readFileSync(path.join(APP, "src/data/sites.ts"), "utf8");
  const appPos = {};
  for (const m of seeds.matchAll(/id: "(earth-[^"]+)",[\s\S]*?lat: (-?[\d.]+),\s*lon: (-?[\d.]+),/g)) appPos[m[1]] = { lat: Number(m[2]), lon: Number(m[3]) };
  const index = readJson("processed/imagery-index.json");
  const out = {};
  for (const img of index) {
    const appId = EARTH_IDS[img.id];
    if (!appId) throw new Error(`imagery: no app site for ${img.id}`);
    const pos = appPos[appId];
    if (!pos) throw new Error(`imagery: ${appId} not found in sites.ts`);
    const receipt = JSON.parse(readFileSync(p(img.file + ".source.json"), "utf8"));
    const [w, s, e, n] = img.bbox_lon_lat;
    const inside = pos.lon >= w && pos.lon <= e && pos.lat >= s && pos.lat <= n;
    copyFileSync(p(img.file), path.join(OUT_PUBLIC, "earth", `${appId}.jpg`));
    out[appId] = {
      file: `pack/earth/${appId}.jpg`,
      layer: img.layer,
      bbox: img.bbox_lon_lat,
      retrievedAt: receipt.retrieved_at_utc,
      requestUrl: receipt.resolved_url,
      // Where the app's own coordinates fall in the image (0-1), or null when outside the frame.
      marker: inside ? { x: (pos.lon - w) / (e - w), y: (n - pos.lat) / (n - s) } : null,
    };
  }
  return {
    source: "NASA GIBS, Blue Marble shaded relief and bathymetry",
    note: "Composite context imagery about 1° of latitude across. Not a dated single acquisition, a geologic measurement or a terrain model.",
    sites: out,
  };
}

// ---------------------------------------------------------------- run
const t0 = Date.now();
const geo = loadGeoUnits();
console.log(`GeoUnits: ${geo.count} polygons`);
const pits = buildPits(geo);
writeJson("lunar-pits.json", pits);
console.log(`lunar-pits.json: ${pits.count} pits, ${pits.pits.filter((x) => !x.unit).length} without a map unit`);
const mg = buildMoonGeology(geo);
writeJson("moon-geology.json", mg);
console.log(`moon-geology.json: ${Object.entries(mg.targets).map(([k, v]) => `${k}=${v.unit?.code}`).join(" ")}`);
const relief = buildMoonRelief();
console.log(`moon-lola-relief.png: heights ${relief.minM} to ${relief.maxM} m`);
const polar = buildPolarContext();
writeJson("polar-context.json", polar);
console.log(`polar-context.json: ${Object.entries(polar.sites).map(([k, v]) => `${k} ${v.rows} rows`).join(", ")}`);
const imagery = buildEarthImagery();
writeJson("earth-imagery.json", imagery);
console.log(`earth-imagery.json: ${Object.keys(imagery.sites).length} images, ${Object.values(imagery.sites).filter((s) => !s.marker).length} with the app point outside the frame`);
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
