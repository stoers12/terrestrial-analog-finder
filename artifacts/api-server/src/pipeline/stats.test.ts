import assert from "node:assert/strict";
import { test } from "node:test";
import {
  KELVIN,
  mean,
  round,
  T_MAX_K,
  T_MIN_K,
  tailMean,
} from "./stats.ts";

test("mean averages an array-like sample and rejects an empty sample", () => {
  assert.equal(mean([10, 20, 30]), 20);
  assert.equal(mean(new Int16Array([2, 4, 6])), 4);
  assert.throws(() => mean([]), /mean of an empty sample/);
});

test("tailMean averages the rounded number of lowest or highest values without sorting its input", () => {
  const values = [9, 1, 8, 2, 7, 3, 6, 4, 5, 10];
  assert.equal(tailMean(values, 0.3, "low"), 2);
  assert.equal(tailMean(values, 0.3, "high"), 9);
  assert.deepEqual(values, [9, 1, 8, 2, 7, 3, 6, 4, 5, 10]);
  assert.throws(() => tailMean(values.slice(0, 9), 0.1, "low"), /at least 10 samples/);
});

test("rounding and temperature constants remain in the documented units", () => {
  assert.equal(round(12.345, 2), 12.35);
  assert.equal(KELVIN, 273.15);
  assert.equal(T_MIN_K, 20);
  assert.equal(T_MAX_K, 450);
});
