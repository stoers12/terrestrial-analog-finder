import { useMemo } from "react";
import type { Site } from "@/data/sites";
import { rankAnalogs, type Weights } from "@/lib/similarity";
import { scoreColor } from "@/lib/analog-ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Panel, PanelHead } from "@/components/instrument";
import { StatusGlyph } from "@/components/ranked-list";
import { cn } from "@/lib/utils";

interface Props {
  earthSites: Site[];
  targetSites: Site[];
  weights: Weights;
  targetId: string;
  selectedId: string | null;
  onPick: (targetId: string, siteId: string) => void;
}

export function CoverageMatrix({ earthSites, targetSites, weights, targetId, selectedId, onPick }: Props) {
  const { cols, grid, top3 } = useMemo(() => {
    const grid: Record<string, Record<string, number>> = {};
    const top3: Record<string, Set<string>> = {};
    for (const t of targetSites) {
      const r = rankAnalogs(t, weights, earthSites);
      grid[t.id] = Object.fromEntries(r.map((m) => [m.site.id, m.score]));
      top3[t.id] = new Set(r.slice(0, 3).map((m) => m.site.id));
    }
    const cols = earthSites.map((e) => {
      const count = targetSites.filter((t) => top3[t.id].has(e.id)).length;
      const mean = targetSites.reduce((a, t) => a + grid[t.id][e.id], 0) / targetSites.length;
      return { site: e, count, mean };
    }).sort((a, b) => b.count - a.count || b.mean - a.mean);
    return { cols, grid, top3 };
  }, [weights, earthSites, targetSites]);
  const maxCount = Math.max(1, ...cols.map((c) => c.count));

  return (
    <Panel className="p-4 md:p-6" data-testid="panel-matrix">
      <PanelHead index="05" eyebrow="All missions at once" title={<span className="text-2xl md:text-3xl">Which Earth sites serve several missions?</span>} />
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
        <span>Columns sorted by how many targets rank the site in their top three. Click any cell to compare.</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-[2px] ring-2 ring-foreground ring-offset-1 ring-offset-card" /> top three</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-[2px] ring-2 ring-primary ring-offset-1 ring-offset-card" /> in view</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${scoreColor(35)}, ${scoreColor(57)}, ${scoreColor(80)})` }} /> score 35 to 80+
        </span>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        <table className="border-separate border-spacing-[3px] text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card" />
              {cols.map(({ site }) => {
                const on = site.id === selectedId;
                return (
                  <th key={site.id} className={cn("h-40 w-8 rounded-t-[3px] align-bottom", on && "bg-primary/10")}>
                    <div className={cn("mx-auto flex w-4 items-center gap-1.5 whitespace-nowrap text-left font-medium [writing-mode:vertical-rl] rotate-180", on ? "font-bold text-primary" : "text-foreground/80")}>
                      <StatusGlyph status={site.status ?? "established"} className="text-foreground/60" />
                      {site.name}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {targetSites.map((t, ti) => {
              const rowOn = t.id === targetId;
              const newBody = ti > 0 && targetSites[ti - 1].body !== t.body;
              return (
                <tr key={t.id} className={cn(newBody && "[&>*]:border-t-[6px] [&>*]:border-transparent")}>
                  <th className={cn("sticky left-0 z-10 whitespace-nowrap rounded-l-[3px] bg-card pr-3 text-left font-medium", rowOn && "font-bold")}>
                    <span className={cn("flex items-center gap-2 rounded-[3px] px-2 py-1", rowOn && "bg-secondary text-secondary-foreground")}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: `hsl(var(--${t.body}))` }} />
                      {t.name}
                    </span>
                  </th>
                  {cols.map(({ site }) => {
                    const s = grid[t.id][site.id];
                    const isTop = top3[t.id].has(site.id);
                    const isSel = rowOn && site.id === selectedId;
                    const cross = rowOn || site.id === selectedId;
                    return (
                      <td key={site.id} className={cn("p-0", cross && !isSel && "bg-primary/[.06]")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onPick(t.id, site.id)}
                              data-testid={`cell-matrix-${t.id}-${site.id}`}
                              className={cn(
                                "relative grid h-7 w-8 place-items-center rounded-[3px] font-mono text-[9px] font-medium text-foreground/85 transition-transform duration-150 hover:z-10 hover:scale-125",
                                !cross && "opacity-90",
                                isTop && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                                isSel && "z-10 scale-110 ring-[3px] ring-primary ring-offset-2 ring-offset-card font-bold",
                              )}
                              style={{ background: scoreColor(s) }}
                            >
                              {Math.round(s)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="font-mono">{s.toFixed(1)}</span> / {site.name} for {t.name}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <th className="sticky left-0 z-10 bg-card pr-3 pt-3 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Top-3 count</th>
              {cols.map(({ site, count }) => (
                <td key={site.id} className="pt-3 align-bottom">
                  <div className="mx-auto flex h-10 w-8 flex-col items-center justify-end gap-0.5">
                    <div className="w-3 rounded-[1px] bg-secondary" style={{ height: `${(count / maxCount) * 26}px` }} />
                    <span className={cn("font-mono text-[10px]", count ? "font-bold" : "text-muted-foreground")}>{count || "-"}</span>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
