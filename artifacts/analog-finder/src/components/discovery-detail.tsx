import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import type { Site } from "@/data/sites";
import type { Discovery } from "@/lib/discoveries";
import { DIMENSIONS, MEASURABLE_DIMENSIONS } from "@/lib/similarity";
import { fmt, limits, rehearsal, verdict } from "@/lib/analog-ui";
import { Radar, ScoreGauge } from "@/components/site-detail";
import { TargetProvenance, TemperatureDefinitions } from "@/components/target-provenance";
import { DimensionLedger, LimitsStrip, Panel, ProvTag, RehearsalColumns } from "@/components/instrument";
import { buildLedgerRows } from "@/components/ledger-rows";

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
  const rows = buildLedgerRows(target, s, discovery.dimensions, { keys: MEASURABLE_DIMENSIONS });
  return (
    <motion.div key={`${target.id}-${s.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Panel className="overflow-hidden border-primary/40" data-testid="panel-discovery-detail">
        <div className="absolute inset-x-0 top-0 h-[3px] hatch-primary" />
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-foreground/10 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span className="rounded-[2px] bg-primary px-1.5 py-px text-primary-foreground">D{rank}</span>
              <span>Uncatalogued</span><span className="opacity-40">/</span><span>{cellSizeDeg}° grid cell</span>
            </div>
            <h3 className="font-display mt-1 text-3xl font-extrabold leading-tight md:text-4xl" data-testid="text-discovery-name">{s.name}</h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Centre of a {cellSizeDeg}° grid cell, <span className="font-mono text-foreground">{Math.round(discovery.nearestKm).toLocaleString("en-US")} km</span> from the nearest catalogued site ({discovery.nearestSite.name}). Nobody in this catalogue uses it as an analog yet.
            </p>
            <div className="mt-2 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-md border border-foreground/10 bg-foreground/10 font-mono text-[11px]">
              {[
                ["Elevation", fmt.metres(s.measured?.elevationM ?? 0)],
                ["Relief", fmt.metres(s.measured?.reliefM ?? 0)],
                ["Latitude", fmt.lat(s.lat)],
              ].map(([k, val]) => (
                <div key={k} className="bg-card px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{k}</div>
                  <div className="font-bold">{val}</div>
                </div>
              ))}
            </div>
          </div>
          <ScoreGauge score={discovery.score} caption={v.label} sub={`against ${target.name}, measurable dimensions only`} />
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Radar dimensions={dims} values={discovery.dimensions} />
            <div className="flex gap-2 rounded-md border border-dashed border-primary/50 bg-primary/[.04] p-3 text-xs leading-relaxed text-muted-foreground">
              <TriangleAlert className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Geology and isolation are not part of this score because no global dataset for them is loaded. Before treating this as an analog, check the local geology (surface materials, volcanic or
                impact features, caves) and logistics. Values describe the cell centre; a smaller area inside the cell may match much better or worse.
              </span>
            </div>
          </div>
          <div className="min-w-0 space-y-5">
            <div data-testid="table-discovery-values">
              <DimensionLedger rows={rows} targetLabel={target.body === "moon" ? "Moon" : "Mars"} earthLabel="Cell" />
            </div>
            <RehearsalColumns tests={reh.tests} gaps={reh.gaps} emptyTests="Nothing matches strongly enough to recommend as a rehearsal." emptyGaps="No measurable dimension is clearly weak for this pairing." />
            <div className="space-y-2 rounded-md border border-foreground/10 bg-background/40 p-3">
              <TemperatureDefinitions body={target.body as "moon" | "mars"} />
              <TargetProvenance target={target} />
              <p className="text-[11px] text-muted-foreground"><ProvTag kind="measured" className="mr-1.5" />{climateSource}; {elevationSource}.</p>
            </div>
          </div>
        </div>
        <LimitsStrip items={limits(target, s)} />
      </Panel>
    </motion.div>
  );
}
