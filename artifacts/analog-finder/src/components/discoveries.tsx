import { Compass, Loader2, TriangleAlert } from "lucide-react";
import type { Discovery } from "@/lib/discoveries";
import { cellKey, EXCLUSION_KM } from "@/lib/discoveries";
import { cellLithology } from "@/data/evidence";
import { DIMENSIONS, MEASURABLE_DIMENSIONS } from "@/lib/similarity";
import { scoreColor } from "@/lib/analog-ui";
import { cn } from "@/lib/utils";

export interface GridProgress {
  phase: string;
  landCells: number;
  measured: number;
  failed: number;
  error: string | null;
  cellSizeDeg: number;
}

interface Props {
  discoveries: Discovery[];
  progress: GridProgress | null;
  loadError: Error | null;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  rockOptions: { code: string; name: string; count: number }[];
  rockClass: string;
  onRockClass: (code: string) => void;
}

export function Discoveries({ discoveries, progress, loadError, selectedKey, onSelect, rockOptions, rockClass, onRockClass }: Props) {
  const rockName = rockOptions.find((o) => o.code === rockClass)?.name ?? null;
  const filling = progress && progress.phase !== "done" && progress.phase !== "error";
  const pct = progress && progress.landCells > 0 ? Math.round((progress.measured / progress.landCells) * 100) : 0;
  return (
    <section className="rounded-md border border-foreground/15 bg-card/80 p-3" data-testid="panel-discoveries">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Compass className="h-4 w-4 text-primary" />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Global grid · preliminary</div>
          <h3 className="font-display text-lg font-bold leading-tight">Leads outside catalogued areas</h3>
        </div>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        Every measured land cell ({progress?.cellSizeDeg ?? 4}° grid) is scored on {MEASURABLE_DIMENSIONS.length} measurable dimensions ({MEASURABLE_DIMENSIONS.map((k) => DIMENSIONS.find((x) => x.key === k)?.label.toLowerCase()).join(", ")}).
        Cells within {EXCLUSION_KM} km of a site in this catalogue version are hidden. These are preliminary candidates to check: geology and isolation are not scored, and other analog lists and literature have not been searched.
      </p>

      {rockOptions.length > 0 && (
        <div className="mt-2 flex items-center gap-2 px-1" data-testid="filter-rock-type">
          <label htmlFor="rock-type" className="shrink-0 text-[11px] text-muted-foreground">Rock type (GLiM)</label>
          <select
            id="rock-type"
            value={rockClass}
            onChange={(e) => onRockClass(e.target.value)}
            className="h-7 min-w-0 flex-1 rounded-sm border border-foreground/20 bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="select-rock-type"
          >
            <option value="all">Any rock type</option>
            {rockOptions.map((o) => (
              <option key={o.code} value={o.code}>{o.name} ({o.count} cells)</option>
            ))}
          </select>
        </div>
      )}
      {rockName && <p className="mt-1 px-1 text-[10px] text-muted-foreground">Showing only cells whose 0.5° GLiM class at the cell centre is {rockName.toLowerCase()}. A filter only; it does not change any fit index.</p>}

      {loadError && (
        <div className="mt-2 flex gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive" data-testid="status-grid-error">
          <TriangleAlert className="h-4 w-4 shrink-0" /> Could not load the global grid: {loadError.message}
        </div>
      )}
      {progress?.error && (
        <div className="mt-2 flex gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive" data-testid="status-grid-job-error">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {progress.error}
        </div>
      )}
      {filling && (
        <div className="mt-2 rounded-sm bg-muted p-2 text-xs" data-testid="status-grid-progress">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progress.phase === "land-mask" ? "Mapping land cells from the elevation model" : `Measuring land cells from NASA POWER: ${progress.measured} of ${progress.landCells}`}
          </div>
          {progress.phase === "climate" && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="mt-1 text-[11px] text-muted-foreground">Results below are partial and refresh automatically.</div>
        </div>
      )}

      <ol className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {discoveries.length === 0 && !filling && !loadError && (
          <li className="rounded-sm border border-dashed border-foreground/25 p-3 text-xs text-muted-foreground" data-testid="empty-discoveries">
            {rockName ? (
              <>
                No measured {rockName.toLowerCase()} cell lies more than {EXCLUSION_KM} km from the catalogued sites.{" "}
                <button type="button" onClick={() => onRockClass("all")} className="font-medium text-foreground underline decoration-foreground/30">Show any rock type</button>
              </>
            ) : (
              <>No measured cell lies more than {EXCLUSION_KM} km from the catalogued sites yet.</>
            )}
          </li>
        )}
        {discoveries.map((d, i) => {
          const key = cellKey(d.cell);
          const top = [...MEASURABLE_DIMENSIONS].sort((a, b) => (d.dimensions[b] ?? 0) - (d.dimensions[a] ?? 0)).slice(0, 2);
          const label = (k: string) => DIMENSIONS.find((x) => x.key === k)?.label.toLowerCase();
          return (
            <li key={key}>
              <button
                onClick={() => onSelect(key)}
                data-testid={`button-discovery-${i + 1}`}
                className={cn(
                  "w-full rounded-sm border px-3 py-2 text-left transition-colors hover:border-foreground/40",
                  key === selectedKey ? "border-primary bg-primary/10" : "border-foreground/10 bg-card/70",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    <span className="mr-1.5 font-mono text-xs text-primary">L{i + 1}</span>
                    {d.site.name}
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums" style={{ color: scoreColor(d.score) }}>{d.score.toFixed(1)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Matches on {label(top[0])} and {label(top[1])} · {Math.round(d.nearestKm).toLocaleString("en-US")} km from {d.nearestSite.name}
                  {cellLithology(d.cell) && <> · GLiM: {cellLithology(d.cell)!.toLowerCase()}</>}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
