import { Compass, TriangleAlert } from "lucide-react";
import type { Discovery } from "@/lib/discoveries";
import { cellKey } from "@/lib/discoveries";
import { DIMENSIONS, MEASURABLE_DIMENSIONS } from "@/lib/similarity";
import { scoreColor } from "@/lib/analog-ui";
import { Panel, PanelHead, ProvTag } from "@/components/instrument";
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
}

const SLOTS = 96;

/** The grid-fill job drawn as a field of cells: measured cells solid, failures marked, pending ones as outlines. */
function GridFill({ progress }: { progress: GridProgress | null }) {
  const total = progress?.landCells ?? 0;
  const mapping = !progress || progress.phase === "land-mask" || progress.phase === "idle";
  const done = total > 0 ? Math.round((progress!.measured / total) * SLOTS) : 0;
  const failed = total > 0 ? Math.min(SLOTS - done, Math.ceil((progress!.failed / total) * SLOTS)) : 0;
  const pct = total > 0 ? (progress!.measured / total) * 100 : 0;
  const phaseLabel: Record<string, string> = { idle: "Queued", "land-mask": "Mapping land", climate: "Measuring", done: "Complete", error: "Stopped" };
  return (
    <div className="rounded-md border border-foreground/10 bg-background/50 p-3" data-testid="status-grid-progress">
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", progress?.phase === "done" ? "bg-[hsl(var(--measured))]" : progress?.phase === "error" ? "bg-destructive" : "live-dot bg-primary")} />
          {phaseLabel[progress?.phase ?? "idle"] ?? progress?.phase}
        </span>
        <span className="tabular-nums text-foreground">{mapping ? "--" : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="mt-2 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]">
        {Array.from({ length: SLOTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[1px] transition-colors duration-500",
              mapping ? "bg-foreground/10 animate-pulse" : i < done ? "bg-[hsl(var(--measured))]" : i < done + failed ? "bg-destructive/60" : "border border-foreground/15",
            )}
            style={mapping ? { animationDelay: `${(i % 24) * 40}ms` } : undefined}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono">
          {mapping ? "Mapping land cells from the elevation model" : `${progress!.measured.toLocaleString("en-US")} / ${total.toLocaleString("en-US")} land cells`}
          {progress && progress.failed > 0 && <span className="text-destructive"> / {progress.failed} failed</span>}
        </span>
        <ProvTag kind="measured" compact />
      </div>
      {progress && progress.phase !== "done" && progress.phase !== "error" && (
        <div className="mt-1 text-[11px] text-muted-foreground">Results below are partial and refresh automatically.</div>
      )}
    </div>
  );
}

export function Discoveries({ discoveries, progress, loadError, selectedKey, onSelect }: Props) {
  const filling = progress && progress.phase !== "done" && progress.phase !== "error";
  return (
    <Panel className="p-3" data-testid="panel-discoveries">
      <PanelHead
        className="px-1"
        index="02"
        eyebrow="Global grid search"
        title="Discoveries"
        right={<Compass className="mb-1 h-4 w-4 text-primary" />}
      />
      <p className="mt-1.5 px-1 text-[11px] leading-snug text-muted-foreground">
        Every measured land cell ({progress?.cellSizeDeg ?? 4}° grid) is scored on {MEASURABLE_DIMENSIONS.length} measurable dimensions. Cells within 600 km of a catalogued site are hidden.
        Geology and isolation cannot be scored globally, so treat these as places to investigate.
      </p>

      <div className="mt-3">
        <GridFill progress={progress} />
      </div>

      {loadError && (
        <div className="mt-2 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive" data-testid="status-grid-error">
          <TriangleAlert className="h-4 w-4 shrink-0" /> Could not load the global grid: {loadError.message}
        </div>
      )}
      {progress?.error && (
        <div className="mt-2 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive" data-testid="status-grid-job-error">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {progress.error}
        </div>
      )}

      <ol className="mt-3 max-h-[420px] space-y-1 overflow-y-auto pr-1">
        {discoveries.length === 0 && !filling && !loadError && (
          <li className="relative overflow-hidden rounded-md border border-dashed border-foreground/25 p-4 text-center text-xs text-muted-foreground">
            <div className="absolute inset-0 hatch-faint" />
            <span className="relative">No uncatalogued cells measured yet.</span>
          </li>
        )}
        {discoveries.length === 0 && filling && (
          <li className="space-y-1">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-foreground/[.06]" style={{ animationDelay: `${i * 150}ms` }} />)}
          </li>
        )}
        {discoveries.map((d, i) => {
          const key = cellKey(d.cell);
          const sel = key === selectedKey;
          const top = [...MEASURABLE_DIMENSIONS].sort((a, b) => (d.dimensions[b] ?? 0) - (d.dimensions[a] ?? 0)).slice(0, 2);
          const label = (k: string) => DIMENSIONS.find((x) => x.key === k)?.label.toLowerCase();
          return (
            <li key={key}>
              <button
                onClick={() => onSelect(key)}
                data-testid={`button-discovery-${i + 1}`}
                className={cn(
                  "grid w-full grid-cols-[34px_minmax(0,1fr)_48px] items-center gap-2 rounded-md border py-2 pl-2 pr-3 text-left transition-all",
                  sel ? "border-primary bg-primary/10 shadow-sm" : "border-transparent hover:border-foreground/15 hover:bg-card",
                )}
              >
                <span className="grid place-items-center">
                  <span className={cn("grid h-6 w-6 rotate-45 place-items-center border-2 border-primary", sel ? "bg-primary text-primary-foreground" : "bg-card text-primary")}>
                    <span className="-rotate-45 font-mono text-[9px] font-bold">D{i + 1}</span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[13px] font-semibold">{d.site.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {label(top[0])}, {label(top[1])} / {Math.round(d.nearestKm).toLocaleString("en-US")} km from {d.nearestSite.name}
                  </span>
                </span>
                <span className="text-right font-mono text-base font-bold tabular-nums" style={{ color: scoreColor(d.score) }}>{d.score.toFixed(1)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
