import https from "node:https";

/**
 * Minimal reader for PDS3 raster products (flat binary image + .lbl label).
 * Windows are read with HTTP Range requests, so multi-gigabyte rasters are never downloaded whole.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

/** Hosts whose certificate chain does not verify. Public read-only data; used for these hosts only. */
const INSECURE_TLS_HOSTS = new Set(["atmos.nmsu.edu"]);
const insecureAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

function insecureGet(url: string, headers: Record<string, string>): Promise<{ status: number; body: Buffer; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: insecureAgent, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks), headers: res.headers }));
      res.on("error", reject);
    });
    req.setTimeout(120_000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

export async function httpGet(url: string, range?: [number, number]): Promise<{ status: number; body: Buffer; totalBytes: number | null }> {
  const headers: Record<string, string> = {};
  if (range) headers["Range"] = `bytes=${range[0]}-${range[1]}`;
  const host = new URL(url).hostname;
  if (INSECURE_TLS_HOSTS.has(host)) {
    const r = await insecureGet(url, headers);
    const cr = String(r.headers["content-range"] ?? "");
    const total = /\/(\d+)$/.exec(cr)?.[1] ?? String(r.headers["content-length"] ?? "");
    return { status: r.status, body: r.body, totalBytes: total ? Number(total) : null };
  }
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(120_000) });
  const body = Buffer.from(await res.arrayBuffer());
  const cr = res.headers.get("content-range") ?? "";
  const total = /\/(\d+)$/.exec(cr)?.[1] ?? res.headers.get("content-length");
  return { status: res.status, body, totalBytes: total ? Number(total) : null };
}

export async function fetchText(url: string): Promise<string> {
  return withRetry(`GET ${url}`, async () => {
    const r = await httpGet(url);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return r.body.toString("utf8");
  });
}

export async function fetchBytes(url: string, start: number, end: number): Promise<Buffer> {
  return withRetry(`Range ${start}-${end} of ${url}`, async () => {
    const r = await httpGet(url, [start, end]);
    if (r.status !== 206) throw new Error(`HTTP ${r.status} (range requests not honoured)`);
    if (r.body.length !== end - start + 1) throw new Error(`short read: got ${r.body.length} bytes, wanted ${end - start + 1}`);
    return r.body;
  });
}

/** Parse the flat KEY = VALUE lines of a PDS3 label (first occurrence wins). */
export function parseLabel(text: string, keepUnits = false): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*\^?([A-Z0-9_:]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    if (key in out) continue;
    out[key] = (keepUnits ? m[2].replace(/[<>]/g, "") : m[2].replace(/<[^>]*>/g, "")).replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

export type SampleKind = "int16le" | "int16be" | "float32le";

export interface Raster {
  url: string;
  labelUrl: string;
  product: string;
  lines: number;
  samples: number;
  kind: SampleKind;
  bytesPerSample: number;
  scale: number;
  offset: number;
  missing: number | null;
  /** Pixel size in the units the product states (degrees per pixel for cylindrical, metres for polar). */
  pixelSize: string;
  label: Record<string, string>;
}

export interface RasterExpect {
  lines?: number;
  samples?: number;
  kind?: SampleKind;
}

/**
 * Open a raster: read its label, check it describes the file we expect, and check the
 * file on the server has exactly lines x samples x bytes. Anything unexpected throws.
 */
export async function openRaster(imgUrl: string, expect: RasterExpect = {}): Promise<Raster> {
  const labelUrl = imgUrl.replace(/\.img$/i, ".lbl");
  const labelText = await fetchText(labelUrl);
  const label = parseLabel(labelText);
  const labelWithUnits = parseLabel(labelText, true);
  const lines = Number(label["LINES"]);
  const samples = Number(label["LINE_SAMPLES"]);
  const bits = Number(label["SAMPLE_BITS"]);
  const type = label["SAMPLE_TYPE"];
  if (!lines || !samples || !bits || !type) throw new Error(`${labelUrl}: label is missing LINES, LINE_SAMPLES, SAMPLE_BITS or SAMPLE_TYPE`);
  let kind: SampleKind;
  if (bits === 16 && (type === "LSB_INTEGER" || type === "PC_INTEGER")) kind = "int16le";
  else if (bits === 16 && (type === "MSB_INTEGER" || type === "SUN_INTEGER")) kind = "int16be";
  else if (bits === 32 && (type === "PC_REAL" || type === "LSB_REAL")) kind = "float32le";
  else throw new Error(`${labelUrl}: unsupported sample format ${bits}-bit ${type}`);
  if (expect.lines && expect.lines !== lines) throw new Error(`${labelUrl}: expected ${expect.lines} lines, label says ${lines}`);
  if (expect.samples && expect.samples !== samples) throw new Error(`${labelUrl}: expected ${expect.samples} samples, label says ${samples}`);
  if (expect.kind && expect.kind !== kind) throw new Error(`${labelUrl}: expected ${expect.kind}, label says ${kind}`);

  const bytesPerSample = bits / 8;
  const head = await withRetry(`HEAD ${imgUrl}`, async () => {
    const r = await httpGet(imgUrl, [0, 0]);
    if (r.status !== 206 || r.totalBytes === null) throw new Error(`HTTP ${r.status}, no total size`);
    return r.totalBytes;
  });
  const expected = lines * samples * bytesPerSample;
  if (head !== expected) throw new Error(`${imgUrl}: size ${head} bytes does not match label (${lines} x ${samples} x ${bytesPerSample} = ${expected})`);

  const scale = label["SCALING_FACTOR"] !== undefined ? Number(label["SCALING_FACTOR"]) : 1;
  const offset = label["OFFSET"] !== undefined ? Number(label["OFFSET"]) : 0;
  if (!Number.isFinite(scale) || !Number.isFinite(offset)) throw new Error(`${labelUrl}: bad SCALING_FACTOR/OFFSET`);
  const missing = label["MISSING_CONSTANT"] !== undefined ? Number(label["MISSING_CONSTANT"]) : null;
  const product = label["PRODUCT_ID"] ?? label["FILE_NAME"] ?? imgUrl.split("/").pop()!;
  // Pixel size exactly as the product's own label states it, with its unit.
  const pixelSize = labelWithUnits["MAP_SCALE"] ?? (labelWithUnits["MAP_RESOLUTION"] ? `${labelWithUnits["MAP_RESOLUTION"]}` : "unknown");
  return { url: imgUrl, labelUrl, product, lines, samples, kind, bytesPerSample, scale, offset, missing, pixelSize, label };
}

export interface Window {
  width: number;
  height: number;
  /** Scaled values, NaN where the product marks a pixel as missing. */
  data: Float32Array;
}

/** Read a rectangular window (row/column are 0-based, inside the raster) as scaled floats. */
export async function readWindow(r: Raster, col0: number, row0: number, width: number, height: number): Promise<Window> {
  if (col0 < 0 || row0 < 0 || col0 + width > r.samples || row0 + height > r.lines) {
    throw new Error(`${r.product}: window cols ${col0}..${col0 + width - 1}, rows ${row0}..${row0 + height - 1} falls outside the ${r.samples} x ${r.lines} raster`);
  }
  const rowBytes = r.samples * r.bytesPerSample;
  const out = new Float32Array(width * height);
  // Fetch whole rows in blocks of at most ~4 MB, then slice the columns out.
  const rowsPerBlock = Math.max(1, Math.floor(4_000_000 / rowBytes));
  for (let y = 0; y < height; y += rowsPerBlock) {
    const n = Math.min(rowsPerBlock, height - y);
    let buf: Buffer;
    if (rowBytes > 4_000_000) {
      // Very wide raster: fetch each row's column span only.
      const parts: Buffer[] = [];
      for (let k = 0; k < n; k++) {
        const start = (row0 + y + k) * rowBytes + col0 * r.bytesPerSample;
        parts.push(await fetchBytes(r.url, start, start + width * r.bytesPerSample - 1));
      }
      buf = Buffer.concat(parts);
      for (let k = 0; k < n; k++) for (let x = 0; x < width; x++) out[(y + k) * width + x] = decode(r, buf, (k * width + x) * r.bytesPerSample);
      continue;
    }
    const start = (row0 + y) * rowBytes;
    buf = await fetchBytes(r.url, start, start + n * rowBytes - 1);
    for (let k = 0; k < n; k++) {
      for (let x = 0; x < width; x++) out[(y + k) * width + x] = decode(r, buf, k * rowBytes + (col0 + x) * r.bytesPerSample);
    }
  }
  return { width, height, data: out };
}

function decode(r: Raster, buf: Buffer, pos: number): number {
  let raw: number;
  if (r.kind === "int16le") raw = buf.readInt16LE(pos);
  else if (r.kind === "int16be") raw = buf.readInt16BE(pos);
  else raw = buf.readFloatLE(pos);
  if (r.missing !== null && raw === r.missing) return NaN;
  if (!Number.isFinite(raw)) return NaN;
  return raw * r.scale + r.offset;
}

export async function readPixel(r: Raster, col: number, row: number): Promise<number> {
  const w = await readWindow(r, col, row, 1, 1);
  return w.data[0];
}
