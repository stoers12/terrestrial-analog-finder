import type { AnalogStatus, Site } from "@/components/mockups/analog-ux/_source/data/sites";
import { DIMENSIONS, type DimensionKey, type DimensionScores, type Match } from "@/components/mockups/analog-ux/_source/lib/similarity";
import { GEOLOGY_LABELS } from "@/components/mockups/analog-ux/_source/data/sites";

/** Heat colour for a 0-100 score: cool slate at the bottom, signal orange at the top. */
export function scoreColor(score: number, alpha = 1): string {
  const t = Math.min(1, Math.max(0, (score - 35) / 45));
  const hue = 200 + (16 - 200) * t;
  const sat = 18 + (90 - 18) * t;
  const light = 76 + (52 - 76) * t;
  return `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}% / ${alpha})`;
}

export const STATUS_LABEL: Record<AnalogStatus, string> = {
  established: "Established",
  emerging: "Emerging",
  proposed: "Proposed new",
};

export const STATUS_HINT: Record<AnalogStatus, string> = {
  established: "Part of a formal analog programme today",
  emerging: "Used in campaigns, not yet a standing programme",
  proposed: "New candidate, no formal analog programme",
};

export function verdict(score: number): { label: string; tone: "strong" | "partial" | "weak" } {
  if (score >= 68) return { label: "Strong rehearsal site", tone: "strong" };
  if (score >= 55) return { label: "Partial rehearsal site", tone: "partial" };
  return { label: "Weak analog", tone: "weak" };
}

export const fmt = {
  temp: (c: number) => `${c > 0 ? "+" : ""}${c} °C`,
  kpa: (p: number) => (p === 0 ? "vacuum" : `${p} kPa`),
  mm: (m: number) => `${m} mm/yr`,
  lat: (l: number) => `${Math.abs(l).toFixed(1)}° ${l >= 0 ? "N" : "S"}`,
  ten: (n: number) => `${n}/10`,
  wind: (w: number) => (w === 0 ? "none" : `${w} m/s`),
  metres: (m: number) => `${m.toLocaleString("en-US")} m`,
};

const bodyName = (t: Site) => (t.body === "moon" ? "the Moon" : "Mars");

export interface Rehearsal {
  /** What a field team could test at this site, from the dimensions that match well */
  tests: string[];
  /** Where the analogy is weak or breaks, from the dimensions that match poorly */
  gaps: string[];
}

/**
 * Plain-language reading of a comparison, written from the actual per-dimension scores.
 * Dimensions missing from `dims` (not measurable for grid cells) are skipped.
 */
export function rehearsal(target: Site, site: Site, dims: Partial<DimensionScores>, sharedGeology: string[] = [], missingGeology: string[] = []): Rehearsal {
  const tests: string[] = [];
  const gaps: string[] = [];
  const pct = (k: DimensionKey) => `${Math.round((dims[k] ?? 0) * 100)}%`;
  const has = (k: DimensionKey) => dims[k] !== undefined;
  const where = bodyName(target);

  if (has("thermal")) {
    if ((dims.thermal ?? 0) >= 0.65)
      tests.push(`Cold-soak batteries, seals and suits: coldest surface temperatures average ${fmt.temp(site.minTempC)} here against ${fmt.temp(target.minTempC)} on ${where} (temperature match ${pct("thermal")}).`);
    else
      gaps.push(`Temperature: coldest surface temperatures here average ${fmt.temp(site.minTempC)} but ${fmt.temp(target.minTempC)} on ${where} (match ${pct("thermal")}), so thermal hardware cannot be stress-tested to mission limits.`);
  }
  if (has("atmosphere")) {
    if ((dims.atmosphere ?? 0) >= 0.55)
      tests.push(`Thin, dry-air operations: ${fmt.kpa(site.pressureKpa)} and ${fmt.mm(site.precipMm)} suit corrosion, sensor-drift and ice-sublimation trials (air and water match ${pct("atmosphere")}).`);
    else
      gaps.push(`Air and water: ${fmt.kpa(site.pressureKpa)} and ${fmt.mm(site.precipMm)} against ${fmt.kpa(target.pressureKpa)} and ${fmt.mm(target.precipMm)} on ${where} (match ${pct("atmosphere")}).`);
  }
  if (has("terrain")) {
    if ((dims.terrain ?? 0) >= 0.7)
      tests.push(`Mobility and navigation drills: ${site.measured ? `${fmt.metres(site.measured.reliefM)} of relief within about 15 km` : "similar relief"} gives terrain close to the target's (match ${pct("terrain")}).`);
    else
      gaps.push(`Terrain: relief of ${fmt.ten(site.ruggedness)} against ${fmt.ten(target.ruggedness)} on ${where}, so rover mobility results would not transfer directly (match ${pct("terrain")}).`);
  }
  if (has("dust")) {
    if ((dims.dust ?? 0) >= 0.65)
      tests.push(`Dust and abrasion: mean wind ${fmt.wind(site.windMs)} with ${fmt.mm(site.precipMm)} lets crews test seals, filters and panel soiling (match ${pct("dust")}).`);
    else
      gaps.push(`Wind and dust: mean wind ${fmt.wind(site.windMs)} against ${fmt.wind(target.windMs)} on ${where} (match ${pct("dust")}).`);
  }
  if (has("light") && (dims.light ?? 0) < 0.5)
    gaps.push(`Sun geometry: latitude ${fmt.lat(site.lat)} against ${fmt.lat(target.lat)}, so shadows and power-generation angles will differ (match ${pct("light")}).`);
  else if (has("light") && Math.abs(target.lat) > 65 && Math.abs(site.lat) > 65)
    tests.push(`Low-sun operations: both sit at high latitude, so long shadows and solar-panel pointing can be rehearsed (match ${pct("light")}).`);

  if (sharedGeology.length) tests.push(`Sample and drill on shared settings: ${sharedGeology.map((g) => GEOLOGY_LABELS[g as keyof typeof GEOLOGY_LABELS] ?? g).join(", ")}.`);
  if (missingGeology.length) gaps.push(`Geology: no ${missingGeology.map((g) => (GEOLOGY_LABELS[g as keyof typeof GEOLOGY_LABELS] ?? g).toLowerCase()).join(", ")} here.`);
  return { tests, gaps };
}

export function explain(target: Site, m: Match): string[] {
  const dims = [...DIMENSIONS].sort((a, b) => m.dimensions[b.key] - m.dimensions[a.key]);
  const best = dims.slice(0, 2).map((d) => d.label.toLowerCase());
  const worst = dims[dims.length - 1];
  const v = verdict(m.score);
  const out: string[] = [];
  out.push(
    `${m.site.name} scores ${m.score.toFixed(1)} against ${target.name}: a ${v.label.toLowerCase()}. It matches best on ${best[0]} and ${best[1]}, and worst on ${worst.label.toLowerCase()} (${Math.round(m.dimensions[worst.key] * 100)}%).`,
  );
  if (m.sharedGeology.length) {
    out.push(
      `Crews could rehearse on ${m.sharedGeology.length} of the target's ${target.geology.length} geological settings here${m.missingGeology.length ? `, but would need a second site for the rest` : `, which covers every setting the target offers`}.`,
    );
  } else {
    out.push(`It shares none of the target's geological settings, so it is useful mainly for logistics, climate or terrain drills.`);
  }
  const dT = Math.round(m.site.minTempC - target.minTempC);
  out.push(
    dT > 40
      ? `Its coldest surface temperatures are ${dT} °C warmer than the target, so thermal hardware cannot be stress-tested here.`
      : `Coldest temperatures come within ${Math.abs(dT)} °C of the target, a useful test for batteries, seals and suits.`,
  );
  return out;
}

export function limits(target: Site, earth: Site): { title: string; body: string }[] {
  const g = target.body === "moon" ? "0.17 g" : "0.38 g";
  return [
    {
      title: "Air pressure",
      body:
        target.body === "moon"
          ? `${earth.pressureKpa} kPa of air versus hard vacuum. No Earth surface can reproduce vacuum, dust levitation or thermal behaviour without air.`
          : `${earth.pressureKpa} kPa versus about ${target.pressureKpa} kPa of mostly CO2. Even the highest Earth site has roughly 100 times too much air.`,
    },
    { title: "Gravity", body: `Always 1 g here, versus ${g} on ${target.body === "moon" ? "the Moon" : "Mars"}. Walking, digging and dust settling all behave differently.` },
    {
      title: "Radiation",
      body: "Earth's magnetic field and atmosphere block the cosmic rays and solar particles that crews and electronics would face. Shielding cannot be validated here.",
    },
  ];
}
