import type { AnalogStatus, Site } from "@/data/sites";
import { DIMENSIONS, type Match } from "@/lib/similarity";

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
};

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
  const dT = m.site.minTempC - target.minTempC;
  out.push(
    dT > 40
      ? `Its coldest nights are ${dT} °C warmer than the target, so thermal hardware cannot be stress-tested here.`
      : `Cold nights come within ${Math.abs(dT)} °C of the target, a useful test for batteries, seals and suits.`,
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
