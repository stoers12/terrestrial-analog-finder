import { motion, AnimatePresence } from "framer-motion";
import { SearchX } from "lucide-react";
import type { Match } from "@/lib/similarity";
import { scoreColor, STATUS_LABEL } from "@/lib/analog-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  items: { match: Match; rank: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
  targetKey: string;
  /** Active filters, used to explain an empty result */
  statusLabel: string | null;
  minScore: number;
  /** Best fit index among sites of the selected status, ignoring the minimum */
  bestForStatus: number | null;
}

export function RankedList({ items, selectedId, onSelect, onClearFilters, targetKey, statusLabel, minScore, bestForStatus }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-md border border-dashed border-foreground/25 px-6 py-10 text-center" data-testid="status-empty">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted"><SearchX className="h-5 w-5 text-muted-foreground" /></div>
        <div className="font-display mt-3 text-lg font-semibold">Nothing clears the bar</div>
        <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
          {bestForStatus === null
            ? <>No site in this catalogue has the status “{statusLabel}”.</>
            : <>The minimum fit index is {minScore}{statusLabel ? <>, and among “{statusLabel}” sites</> : <>, and</>} the best reaches {bestForStatus.toFixed(1)}. Lower the minimum{statusLabel ? " or choose another status" : ""} to see them. A low ceiling is itself a finding: this target may need a combination of sites.</>}
        </p>
        <Button size="sm" variant="outline" className="mt-4" onClick={onClearFilters} data-testid="button-clear-filters">Clear filters</Button>
      </div>
    );
  }
  return (
    <ol className="space-y-1.5">
      <AnimatePresence initial={true}>
        {items.map(({ match, rank }, i) => {
          const s = match.site;
          const active = s.id === selectedId;
          return (
            <motion.li
              layout
              key={`${s.id}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ layout: { type: "spring", stiffness: 380, damping: 36 }, delay: Math.min(i, 12) * 0.03 }}
            >
              <button
                onClick={() => onSelect(s.id)}
                data-testid={`row-site-${s.id}`}
                className={cn(
                  "group relative w-full overflow-hidden rounded-[5px] border px-3 py-2 text-left transition-colors",
                  active ? "border-foreground bg-secondary text-secondary-foreground" : "border-foreground/10 bg-card/80 hover:border-foreground/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("w-6 font-mono text-xs", active ? "opacity-70" : "text-muted-foreground")}>{String(rank).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className={cn("flex items-center gap-2 text-[11px]", active ? "opacity-70" : "text-muted-foreground")}>
                      <span className="truncate">{s.region}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1 font-mono text-[9px] uppercase tracking-wider",
                          s.status === "proposed" ? "bg-primary text-primary-foreground" : s.status === "emerging" ? "border border-dashed border-current" : "border border-current",
                        )}
                      >
                        {STATUS_LABEL[s.status ?? "established"]}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold tabular-nums" data-testid={`text-score-${s.id}`}>{match.score.toFixed(1)}</span>
                </div>
                <div className={cn("mt-1.5 h-1 w-full overflow-hidden rounded-full", active ? "bg-secondary-foreground/15" : "bg-muted")}>
                  <motion.div
                    key={targetKey}
                    className="h-full origin-left rounded-full"
                    style={{ background: scoreColor(match.score), width: "100%" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: match.score / 100 }}
                    transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: Math.min(i, 12) * 0.03 }}
                  />
                </div>
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
