import { logger } from "./logger";

export const CLIMATE_SOURCE = "NASA POWER climatology (MERRA-2, 2001-2025); skin temperature (TS)";
export const ELEVATION_SOURCE = "Global DEM (SRTM-based Mapzen terrain tiles via OpenTopoData)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Climate {
  /** Annual mean skin temperature */
  tMeanC: number;
  /** Coldest month's mean daily minimum skin temperature */
  tMinC: number;
  /** Warmest month's mean daily maximum skin temperature */
  tMaxC: number;
  precipMm: number;
  pressureKpa: number;
  windMs: number;
}

/** Retry a flaky public API call a few times, then fail with the real error. */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

// NASA POWER rate-limits bursts (HTTP 429), so all calls share one queue with a gap between requests.
let powerChain: Promise<unknown> = Promise.resolve();

function throttledPowerCall<T>(fn: () => Promise<T>): Promise<T> {
  const run = powerChain.then(fn, fn);
  powerChain = run.then(
    () => sleep(400),
    () => sleep(400),
  );
  return run;
}

export async function fetchPower(lat: number, lon: number): Promise<Climate> {
  const url =
    "https://power.larc.nasa.gov/api/temporal/climatology/point" +
    `?parameters=TS,TS_MIN,TS_MAX,PRECTOTCORR,PS,WS10M&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
  return withRetry(`NASA POWER (${lat}, ${lon})`, () => throttledPowerCall(async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { properties?: { parameter?: Record<string, Record<string, number>> } };
    const p = body.properties?.parameter;
    if (!p) throw new Error("response had no parameter block");
    const ann = (name: string) => {
      const v = p[name]?.ANN;
      if (typeof v !== "number" || v <= -900) throw new Error(`no value for ${name}`);
      return v;
    };
    // Coldest month's mean daily minimum and warmest month's mean daily maximum, from the 12 monthly
    // climatology values (not the annual mean). All three are skin (surface) temperature, the same
    // quantity the Moon and Mars surface-temperature products measure.
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthly = (name: string) =>
      months.map((m) => {
        const v = p[name]?.[m];
        if (typeof v !== "number" || v <= -900) throw new Error(`no monthly value for ${name} ${m}`);
        return v;
      });
    return {
      tMeanC: ann("TS"),
      tMinC: Math.min(...monthly("TS_MIN")),
      tMaxC: Math.max(...monthly("TS_MAX")),
      precipMm: ann("PRECTOTCORR") * 365.25,
      pressureKpa: ann("PS"),
      windMs: ann("WS10M"),
    };
  }), 6);
}

// OpenTopoData's public server allows one request per second.
let elevationChain: Promise<unknown> = Promise.resolve();

function throttledElevationCall<T>(fn: () => Promise<T>): Promise<T> {
  const run = elevationChain.then(fn, fn);
  elevationChain = run.then(
    () => sleep(1150),
    () => sleep(1150),
  );
  return run;
}

export async function fetchElevations(points: { lat: number; lon: number }[]): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 100) {
    const chunk = points.slice(i, i + 100);
    const locations = chunk.map((p) => `${p.lat},${p.lon}`).join("|");
    const url = `https://api.opentopodata.org/v1/mapzen?locations=${locations}`;
    const values = await withRetry(`Elevation lookup (${chunk.length} points)`, () =>
      throttledElevationCall(async () => {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { status?: string; results?: { elevation: number | null }[] };
        if (body.status !== "OK" || !body.results || body.results.length !== chunk.length) throw new Error(`bad response (${body.status})`);
        return body.results.map((r) => {
          if (typeof r.elevation !== "number") throw new Error("missing elevation value");
          return r.elevation;
        });
      }),
    );
    out.push(...values);
    logger.debug({ done: out.length, total: points.length }, "elevation progress");
  }
  return out;
}
