import { motion } from "framer-motion";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import type { Site } from "@/data/sites";
import type { Discovery } from "@/lib/discoveries";
import { DIMENSIONS, MEASURABLE_DIMENSIONS } from "@/lib/similarity";
import { fmt, limits, rehearsal, scoreColor, verdict } from "@/lib/analog-ui";
import { Radar } from "@/components/site-detail";
import { TargetProvenance, TemperatureDefinitions } from "@/components/target-provenance";

interface Props {
  target: Site;
  discovery: Discovery;
  rank: number;
  climateSource: string;
  elevationSource: string;
  cellSizeDeg: number;
}

export function DiscoveryDetail({ target, discovery, rank, climateSource, elevationSource, cellSizeDeg }: Props) {
  const s = discovery.site;
  const dims = DIMENSIONS.filter((d) => MEASURABLE_DIMENSIONS.includes(d.key));
  const v = verdict(discovery.score);
  const reh = rehearsal(target, s, discovery.dimensions);
  const rows: [string, string, string][] = [
    ["Mean surface temperature", fmt.temp(target.meanTempC), fmt.temp(s.meanTempC)],
    ["Coldest surface temperature", fmt.temp(target.minTempC), fmt.temp(s.minTempC)],
    ["Surface pressure", fmt.kpa(target.pressureKpa), fmt.kpa(s.pressureKpa)],
    ["Precipitation", fmt.mm(target.precipMm), fmt.mm(s.precipMm)],
    ["Wind (mean)", fmt.wind(target.windMs), fmt.wind(s.windMs)],
    ["Relief", fmt.ten(target.ruggedness), `${fmt.ten(s.ruggedness)} (${fmt.metres(s.measured?.reliefM ?? 0)})`],
    ["Elevation", target.targetData ? fmt.metres(target.targetData.elevationM) : "n/a", fmt.metres(s.measured?.elevationM ?? 0)],
    ["Latitude", fmt.lat(target.lat), fmt.lat(s.lat)],
  ];
  return (
    <motion.section
      key={`${target.id}-${s.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-md border border-primary/50 bg-card/90"
      data-testid="panel-discovery-detail"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/10 p-5">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Discovery D{rank} · global grid search</div>
          <h3 className="font-display text-3xl font-extrabold leading-tight" data-testid="text-discovery-name">{s.name}</h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Centre of a {cellSizeDeg}° grid cell, {Math.round(discovery.nearestKm).toLocaleString("en-US")} km from the nearest catalogued site ({discovery.nearestSite.name}). Nobody in this catalogue uses it as an analog yet.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-5xl font-bold tabular-nums leading-none" style={{ color: scoreColor(discovery.score) }}>{discovery.score.toFixed(1)}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider">{v.label}</div>
          <div className="text-[11px] text-muted-foreground">vs {target.name}, measurable dimensions only</div>
        </div>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <div>
          <Radar dimensions={dims} values={discovery.dimensions} />
          <div className="mt-2 space-y-1.5">
            {dims.map((d) => (
              <div key={d.key} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">{d.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full origin-left rounded-full bg-secondary" style={{ width: `${(discovery.dimensions[d.key] ?? 0) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-mono tabular-nums">{Math.round((discovery.dimensions[d.key] ?? 0) * 100)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <table className="w-full text-sm" data-testid="table-discovery-values">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="pb-2 text-left font-normal">Value</th>
                <th className="pb-2 text-right font-normal">{target.body === "moon" ? "Moon" : "Mars"}</th>
                <th className="pb-2 text-right font-normal">Earth cell</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, a, b]) => (
                <tr key={k} className="border-t border-foreground/10">
                  <td className="py-1.5 text-muted-foreground">{k}</td>
                  <td className="py-1.5 text-right font-mono">{a}</td>
                  <td className="py-1.5 text-right font-mono font-semibold">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2 rounded-sm border border-dashed border-foreground/30 p-3 text-xs text-muted-foreground">
            <TriangleAlert className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Geology and isolation are not part of this score because no global dataset for them is loaded. Before treating this as an analog, check the local geology (surface materials, volcanic or
              impact features, caves) and logistics. Values describe the cell centre; a smaller area inside the cell may match much better or worse.
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border-l-2 border-secondary bg-muted/50 px-3 py-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider">What a team could test here</div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {reh.tests.length ? reh.tests.map((t, i) => <li key={i}>{t}</li>) : <li>Nothing matches strongly enough to recommend as a rehearsal.</li>}
              </ul>
            </div>
            <div className="rounded-sm border-l-2 border-primary bg-muted/50 px-3 py-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider">Where the analogy breaks</div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {reh.gaps.length ? reh.gaps.map((t, i) => <li key={i}>{t}</li>) : <li>No measurable dimension is clearly weak for this pairing.</li>}
              </ul>
            </div>
          </div>
          <TemperatureDefinitions body={target.body as "moon" | "mars"} />
          <TargetProvenance target={target} />
          <p className="text-[11px] text-muted-foreground">Measured values: {climateSource}; {elevationSource}.</p>
        </div>
      </div>

      <div className="border-t border-foreground/10 bg-muted/50 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-primary" /> What no Earth site can rehearse</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {limits(target, s).map((l) => (
            <div key={l.title} className="rounded-sm border-l-2 border-primary bg-card/70 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wider">{l.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{l.body}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
