import type { TargetValue, Variable } from "./types";

export function get(values: TargetValue[], id: string, variable: Variable): number {
  const value = values.find((row) => row.siteId === id && row.variable === variable);
  if (!value) throw new Error(`validation: no ${variable} for ${id}`);
  return value.value;
}

/** Sanity checks against published figures. Any failure stops the pipeline: it means a unit, scale or orientation error. */
export function validate(values: TargetValue[], shoemakerColdestC: number, malapertColdestC: number): string[] {
  const out: string[] = [];
  const check = (label: string, ok: boolean, detail: string) => {
    if (!ok) throw new Error(`Validation failed: ${label} (${detail})`);
    out.push(`${label}: ${detail}`);
  };
  const mal = get(values, "moon-malapert", "elevationM");
  check("Malapert Massif height (published about 5 km above the reference sphere)", mal > 4000 && mal < 6000, `${mal} m`);
  const shMean = get(values, "moon-shackleton", "meanTempC") + 273.15;
  check("Shackleton surroundings mean temperature (published: crater floor stays below about 90 K)", shMean < 110, `${shMean.toFixed(1)} K`);
  check("Polar map orientation (Shoemaker crater must be colder than Malapert)", shoemakerColdestC < malapertColdestC, `${shoemakerColdestC.toFixed(1)} C vs ${malapertColdestC.toFixed(1)} C`);
  const eqMin = get(values, "moon-marius", "minTempC") + 273.15;
  const eqMax = get(values, "moon-marius", "maxTempC") + 273.15;
  check("Lunar equator night/day temperatures (published about 95 K night, about 390 K noon)", eqMin > 80 && eqMin < 130 && eqMax > 330 && eqMax < 400, `${eqMin.toFixed(0)} K / ${eqMax.toFixed(0)} K`);
  const jez = get(values, "mars-jezero", "elevationM");
  check("Jezero delta elevation (published about -2.5 km MOLA)", jez > -3300 && jez < -2000, `${jez} m`);
  const jezP = get(values, "mars-jezero", "pressureKpa");
  check("Jezero derived pressure (Mars 2020 MEDA measures about 0.7-0.8 kPa)", jezP > 0.6 && jezP < 0.95, `${jezP} kPa`);
  const gale = get(values, "mars-gale", "elevationM");
  const galeRelief = get(values, "mars-gale", "reliefM");
  check(
    "Gale crater centre sits on Mount Sharp (published: floor about -4.4 km, mound about 5 km high)",
    gale > -4600 && gale < 0 && galeRelief > 2000,
    `${gale} m, relief ${galeRelief} m`,
  );
  const arsia = get(values, "mars-arsia", "elevationM");
  check("Arsia Mons flank is high (published above +10 km at the summit)", arsia > 3000, `${arsia} m`);
  const jezT = get(values, "mars-jezero", "meanTempC");
  check("Jezero mean surface temperature (rover ground temperature ranges about 190-290 K)", jezT > -85 && jezT < -20, `${jezT} C`);
  for (const value of values) check(`finite ${value.siteId} ${value.variable}`, Number.isFinite(value.value), String(value.value));
  return out;
}
