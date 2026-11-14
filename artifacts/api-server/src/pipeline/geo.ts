import type { Raster } from "./raster";

export const MOON_RADIUS_M = 1_737_400;
export const MARS_RADIUS_M = 3_396_000;

const rad = (d: number) => (d * Math.PI) / 180;

/** Orientation of a polar stereographic map: how longitude turns into the image x/y axes. */
export interface PolarOrientation {
  /** +1 if longitude grows counter-clockwise seen from the pole, -1 otherwise */
  sense: 1 | -1;
  /** Image rotation in degrees (0, 90, 180 or 270) */
  rotationDeg: number;
}

/** PDS DSMAP convention for a south polar stereographic map, confirmed against known LOLA topography in verify-orientation. */
export const SOUTH_POLAR: PolarOrientation = { sense: 1, rotationDeg: 0 };

/** Pixel (continuous index, pixel centres at integers) of a lat/lon on a polar stereographic raster. */
export function polarPixel(r: Raster, lat: number, lon: number, radiusM: number, o: PolarOrientation = SOUTH_POLAR): { col: number; row: number } {
  const scaleM = Number(r.label["MAP_SCALE"]);
  const lineOff = Number(r.label["LINE_PROJECTION_OFFSET"]);
  const sampleOff = Number(r.label["SAMPLE_PROJECTION_OFFSET"]);
  const centreLat = Number(r.label["CENTER_LATITUDE"]);
  if (![scaleM, lineOff, sampleOff, centreLat].every(Number.isFinite)) throw new Error(`${r.product}: label lacks polar projection parameters`);
  if (Math.abs(centreLat) !== 90) throw new Error(`${r.product}: not a polar map (CENTER_LATITUDE ${centreLat})`);
  if (Math.sign(centreLat) !== Math.sign(lat)) throw new Error(`${r.product}: point ${lat},${lon} is in the wrong hemisphere for this map`);
  const colat = 90 - Math.abs(lat);
  // Stereographic projection of a sphere with scale factor 1 at the pole.
  const rho = 2 * radiusM * Math.tan(rad(colat) / 2);
  const theta = rad(o.sense * lon + o.rotationDeg);
  const x = rho * Math.sin(theta);
  const y = rho * Math.cos(theta) * (centreLat < 0 ? 1 : -1);
  return { col: sampleOff + x / scaleM, row: lineOff - y / scaleM };
}

/** Pixel of a lat/lon on a simple-cylindrical raster (west edge / top latitude read from the label). */
export function cylPixel(r: Raster, lat: number, lon: number): { col: number; row: number } {
  const ppd = Number(r.label["MAP_RESOLUTION"]);
  const maxLat = Number(r.label["MAXIMUM_LATITUDE"]);
  const west = Number(r.label["WESTERNMOST_LONGITUDE"]);
  if (![ppd, maxLat, west].every(Number.isFinite)) throw new Error(`${r.product}: label lacks cylindrical projection parameters`);
  const lon360 = ((lon % 360) + 360) % 360;
  const dLon = (((lon360 - west) % 360) + 360) % 360;
  return { col: dLon * ppd - 0.5, row: (maxLat - lat) * ppd - 0.5 };
}

export const pixelIndex = (v: number) => Math.floor(v + 0.5);

/** Ground offset: move a point by metres north and east on a sphere. */
export function offsetPoint(lat: number, lon: number, northM: number, eastM: number, radiusM: number): { lat: number; lon: number } {
  const dLat = (northM / radiusM) * (180 / Math.PI);
  const newLat = lat + dLat;
  if (Math.abs(newLat) >= 89.999) throw new Error(`offsetPoint: ${newLat} is too close to a pole for a lat/lon offset`);
  const dLon = (eastM / (radiusM * Math.cos(rad(newLat)))) * (180 / Math.PI);
  return { lat: newLat, lon: lon + dLon };
}
