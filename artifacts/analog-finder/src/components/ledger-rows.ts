import type { Site } from "@/data/sites";
import { DIMENSIONS, type DimensionKey, type DimensionScores, type Weights } from "@/lib/similarity";
import { fmt } from "@/lib/analog-ui";
import type { LedgerRow, ValueCell } from "@/components/instrument";

/** Turn per-dimension scores into ledger rows, tagging every value with its provenance. */
export function buildLedgerRows(target: Site, earth: Site, dims: Partial<DimensionScores>, opts: { keys?: DimensionKey[]; weights?: Weights; sharedGeology?: number } = {}): LedgerRow[] {
  const tv = target.targetData?.values;
  const tk = (k: keyof NonNullable<typeof tv>) => tv?.[k].kind;
  const m = earth.measured;
  const cells: Record<DimensionKey, { t: ValueCell[]; e: ValueCell[] }> = {
    thermal: {
      t: [{ text: `mean ${fmt.temp(target.meanTempC)}`, kind: tk("meanTempC") }, { text: `cold ${fmt.temp(target.minTempC)}`, kind: tk("minTempC") }],
      e: [{ text: `mean ${fmt.temp(earth.meanTempC)}`, kind: "measured" }, { text: `cold ${fmt.temp(earth.minTempC)}`, kind: "measured" }],
    },
    atmosphere: {
      t: [{ text: fmt.kpa(target.pressureKpa), kind: tk("pressureKpa") }, { text: fmt.mm(target.precipMm), kind: "reference" }],
      e: [{ text: fmt.kpa(earth.pressureKpa), kind: "measured" }, { text: fmt.mm(earth.precipMm), kind: "measured" }],
    },
    geology: {
      t: [{ text: `${target.geology.length} settings`, kind: "editorial" }],
      e: [{ text: `${opts.sharedGeology ?? 0} shared`, kind: "editorial" }],
    },
    terrain: {
      t: [{ text: `${fmt.ten(target.ruggedness)}${target.targetData ? ` (${fmt.metres(target.targetData.reliefM)})` : ""}`, kind: tk("reliefM") }],
      e: [{ text: `${fmt.ten(earth.ruggedness)}${m ? ` (${fmt.metres(m.reliefM)})` : ""}`, kind: "measured" }],
    },
    light: { t: [{ text: fmt.lat(target.lat) }], e: [{ text: fmt.lat(earth.lat) }] },
    dust: {
      t: [{ text: fmt.wind(target.windMs), kind: tk("windMs") }],
      e: [{ text: fmt.wind(earth.windMs), kind: "measured" }],
    },
    isolation: {
      t: [{ text: fmt.ten(target.isolation), kind: "editorial" }],
      e: [{ text: fmt.ten(earth.isolation), kind: "editorial" }],
    },
  };
  return DIMENSIONS.filter((d) => (opts.keys ? opts.keys.includes(d.key) : true)).map((d) => ({
    key: d.key,
    label: d.label,
    description: d.description,
    score: dims[d.key] ?? 0,
    weight: opts.weights?.[d.key],
    target: cells[d.key].t,
    earth: cells[d.key].e,
  }));
}
