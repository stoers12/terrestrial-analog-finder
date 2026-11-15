import assert from "node:assert/strict";
import test from "node:test";
import { reliefGrid } from "../lib/relief-grid.ts";

test("Earth relief uses a fixed metric footprint at equator, poles and dateline", () => {
  for (const centre of [{ lat: 0, lon: 0 }, { lat: 80, lon: 179.99 }, { lat: -89.9, lon: -179.99 }]) {
    const points = reliefGrid(centre);
    assert.equal(points.length, 9);
    assert.deepEqual(points[0], centre);
    const distances = points.slice(1).map((p) => {
      assert.ok(p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180);
      const rad = Math.PI / 180;
      const h = Math.sin((p.lat - centre.lat) * rad / 2) ** 2 +
        Math.cos(p.lat * rad) * Math.cos(centre.lat * rad) * Math.sin((p.lon - centre.lon) * rad / 2) ** 2;
      return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
    }).sort((a, b) => a - b);
    distances.forEach((d, i) => assert.ok(Math.abs(d - (i < 4 ? 15_000 : Math.SQRT2 * 15_000)) < 0.01));
  }
});
