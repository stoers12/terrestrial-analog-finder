import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cylPixel,
  MARS_RADIUS_M,
  MOON_RADIUS_M,
  offsetPoint,
  pixelIndex,
  polarPixel,
  SOUTH_POLAR,
} from "./geo.ts";
import type { Raster } from "./raster.ts";

function raster(label: Record<string, string>): Raster {
  return {
    url: "",
    labelUrl: "",
    product: "projection fixture",
    lines: 1000,
    samples: 1000,
    kind: "int16le",
    bytesPerSample: 2,
    scale: 1,
    offset: 0,
    missing: null,
    pixelSize: "test",
    label,
  };
}

test("polarPixel maps the pole to projection offsets and applies south-polar orientation", () => {
  assert.equal(MOON_RADIUS_M, 1_737_400);
  assert.equal(MARS_RADIUS_M, 3_396_000);

  const map = raster({
    MAP_SCALE: "1000",
    LINE_PROJECTION_OFFSET: "120",
    SAMPLE_PROJECTION_OFFSET: "230",
    CENTER_LATITUDE: "-90",
  });

  assert.deepEqual(polarPixel(map, -90, 123, MOON_RADIUS_M), { col: 230, row: 120 });
  const oneDegree = polarPixel(map, -89, 90, MOON_RADIUS_M);
  const radiusPixels = (2 * MOON_RADIUS_M * Math.tan(Math.PI / 360)) / 1000;
  assert.ok(Math.abs(oneDegree.col - (230 + radiusPixels)) < 1e-9);
  assert.ok(Math.abs(oneDegree.row - 120) < 1e-9);
  assert.deepEqual(SOUTH_POLAR, { sense: 1, rotationDeg: 0 });
});

test("polarPixel rejects missing projection metadata and wrong hemispheres", () => {
  assert.throws(
    () => polarPixel(raster({}), -80, 0, MOON_RADIUS_M),
    /lacks polar projection parameters/,
  );
  assert.throws(
    () => polarPixel(raster({
      MAP_SCALE: "1000",
      LINE_PROJECTION_OFFSET: "0",
      SAMPLE_PROJECTION_OFFSET: "0",
      CENTER_LATITUDE: "-90",
    }), 80, 0, MOON_RADIUS_M),
    /wrong hemisphere/,
  );
});

test("cylPixel wraps longitude and accounts for pixel-centre offsets", () => {
  const map = raster({
    MAP_RESOLUTION: "4",
    MAXIMUM_LATITUDE: "90",
    WESTERNMOST_LONGITUDE: "0",
  });

  assert.deepEqual(cylPixel(map, 90, 0), { col: -0.5, row: -0.5 });
  assert.deepEqual(cylPixel(map, 90, 360), { col: -0.5, row: -0.5 });
  assert.deepEqual(cylPixel(map, 10, -90), { col: 1079.5, row: 319.5 });
  assert.throws(() => cylPixel(raster({}), 0, 0), /lacks cylindrical projection parameters/);
});

test("offsetPoint converts metres to latitude and longitude on the supplied sphere", () => {
  const point = offsetPoint(0, 0, 1000, 1000, MARS_RADIUS_M);
  const expectedDegrees = (1000 / MARS_RADIUS_M) * (180 / Math.PI);
  assert.ok(Math.abs(point.lat - expectedDegrees) < 1e-12);
  const expectedLongitude = expectedDegrees / Math.cos((point.lat * Math.PI) / 180);
  assert.ok(Math.abs(point.lon - expectedLongitude) < 1e-12);

  assert.throws(() => offsetPoint(89.99, 0, 1000, 0, MARS_RADIUS_M), /too close to a pole/);
});

test("pixelIndex rounds continuous pixel-centre indices to the nearest pixel", () => {
  assert.equal(pixelIndex(-0.49), 0);
  assert.equal(pixelIndex(2.49), 2);
  assert.equal(pixelIndex(2.5), 3);
});
