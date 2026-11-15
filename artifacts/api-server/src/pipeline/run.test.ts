import assert from "node:assert/strict";
import { test } from "node:test";
import { validate } from "./validation.ts";
import type { TargetValue, Variable } from "./types.ts";

function value(siteId: string, variable: Variable, n: number): TargetValue {
  return {
    siteId,
    body: siteId.startsWith("moon-") ? "moon" : "mars",
    variable,
    value: n,
    kind: "raw-derived",
    product: "validation fixture",
    sourceUrl: "https://example.invalid",
    processedAt: "2026-01-01T00:00:00.000Z",
    pixelSize: "1 m/pixel",
    cleaningNote: "unit test",
    samples: 10,
  };
}

function validValues(): TargetValue[] {
  return [
    value("moon-malapert", "elevationM", 5000),
    value("moon-malapert", "minTempC", -200),
    value("moon-shackleton", "meanTempC", -190),
    value("moon-marius", "minTempC", -173),
    value("moon-marius", "maxTempC", 110),
    value("mars-jezero", "elevationM", -2500),
    value("mars-jezero", "pressureKpa", 0.75),
    value("mars-jezero", "meanTempC", -50),
    value("mars-gale", "elevationM", -4400),
    value("mars-gale", "reliefM", 3000),
    value("mars-arsia", "elevationM", 11000),
  ];
}

test("validate reports the full set of published-reference sanity checks", () => {
  const results = validate(validValues(), -220, -200);

  const expectedLabels = [
    "Malapert Massif height (published about 5 km above the reference sphere)",
    "Shackleton surroundings mean temperature (published: crater floor stays below about 90 K)",
    "Polar map orientation (Shoemaker crater must be colder than Malapert)",
    "Lunar equator night/day temperatures (published about 95 K night, about 390 K noon)",
    "Jezero delta elevation (published about -2.5 km MOLA)",
    "Jezero derived pressure (Mars 2020 MEDA measures about 0.7-0.8 kPa)",
    "Gale crater centre sits on Mount Sharp (published: floor about -4.4 km, mound about 5 km high)",
    "Arsia Mons flank is high (published above +10 km at the summit)",
    "Jezero mean surface temperature (rover ground temperature ranges about 190-290 K)",
  ];
  expectedLabels.forEach((label, index) => assert.ok(results[index].startsWith(`${label}:`)));
  assert.equal(results.length, 9 + validValues().length);
  assert.ok(results.slice(9).every((result) => result.startsWith("finite ")));
});

test("validate fails loudly when input units, projection, or reference bounds are wrong", () => {
  const cases: Array<{
    name: string;
    update: (values: TargetValue[]) => void;
    shoemakerColdest?: number;
  }> = [
    { name: "Malapert elevation", update: (xs) => { xs[0].value = 5; } },
    { name: "Shackleton temperature", update: (xs) => { xs[2].value = 20; } },
    { name: "polar orientation", update: () => {}, shoemakerColdest: -180 },
    { name: "lunar night temperature", update: (xs) => { xs[3].value = 20; } },
    { name: "lunar day temperature", update: (xs) => { xs[4].value = 200; } },
    { name: "Jezero elevation", update: (xs) => { xs[5].value = -25; } },
    { name: "Jezero pressure", update: (xs) => { xs[6].value = 750; } },
    { name: "Gale elevation and relief", update: (xs) => { xs[8].value = -4400000; } },
    { name: "Gale relief", update: (xs) => { xs[9].value = 1; } },
    { name: "Arsia elevation", update: (xs) => { xs[10].value = 10; } },
    { name: "Jezero temperature", update: (xs) => { xs[7].value = 220; } },
  ];

  for (const scenario of cases) {
    const values = validValues();
    scenario.update(values);
    assert.throws(
      () => validate(values, scenario.shoemakerColdest ?? -220, -200),
      /Validation failed:/,
      scenario.name,
    );
  }
});

test("validate rejects missing and non-finite target values", () => {
  const values = validValues();
  assert.throws(() => validate(values.slice(1), -220, -200), /no elevationM for moon-malapert/);

  values[1].value = Number.NaN;
  assert.throws(() => validate(values, -220, -200), /Validation failed: finite moon-malapert minTempC/);
});
