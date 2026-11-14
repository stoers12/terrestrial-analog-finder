import { useMemo } from "react";
import type { Site } from "@/data/sites";
import { rankAnalogs, type Weights } from "@/lib/similarity";
import { scoreColor } from "@/lib/analog-ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

  return (
    <section className="rounded-md border border-foreground/15 bg-card/80 p-4 md:p-5" data-testid="panel-matrix">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">All missions at once</div>
          <h3 className="font-display text-2xl font-extrabold">Which Earth sites serve several missions?</h3>
          <p className="text-sm text-muted-foreground">Columns sorted by how many targets rank the site in their top three (outlined). Click any cell to compare.</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        <table className="border-separate border-spacing-[3px] text-[11px]">
          <thead>
            <tr>
              <th />
              {cols.map(({ site }) => (
                <th key={site.id} className="h-36 w-8 align-bottom">
                  <div className={cn("mx-auto w-4 whitespace-nowrap text-left font-medium [writing-mode:vertical-rl] rotate-180", site.id === selectedId && "text-primary font-bold")}>
                    {site.status === "proposed" && <span className="text-primary">◆ </span>}
                    {site.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targetSites.map((t) => (
              <tr key={t.id}>
                <th className={cn("whitespace-nowrap pr-3 text-left font-medium", t.id === targetId && "font-bold")}>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: `hsl(var(--${t.body}))` }} />
                  {t.name}
                </th>
                {cols.map(({ site }) => {
                  const s = grid[t.id][site.id];
                  const isTop = top3[t.id].has(site.id);
                  const isSel = t.id === targetId && site.id === selectedId;
                  return (
                    <td key={site.id} className="p-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onPick(t.id, site.id)}
                            data-testid={`cell-matrix-${t.id}-${site.id}`}
                            className={cn(
                              "grid h-7 w-8 place-items-center rounded-[3px] font-mono text-[9px] transition-transform duration-150 hover:scale-125 hover:z-10 relative",
                              isTop && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                              isSel && "ring-2 ring-primary",
                            )}
                            style={{ background: scoreColor(s) }}
                          >
                            {Math.round(s)}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {site.name} for {t.name}: {s.toFixed(1)}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className="pr-3 pt-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Top-3 count</th>
              {cols.map(({ site, count }) => (
                <td key={site.id} className="pt-2 text-center font-mono font-bold">{count || <span className="text-muted-foreground font-normal">-</span>}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
