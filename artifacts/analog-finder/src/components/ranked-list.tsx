import { motion, AnimatePresence } from "framer-motion";
import { SearchX } from "lucide-react";
import type { AnalogStatus } from "@/data/sites";
import type { Match } from "@/lib/similarity";
import { fmt, scoreColor, STATUS_LABEL } from "@/lib/analog-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Same shapes as the map markers: solid ring, dashed ring, diamond. */
export function StatusGlyph({ status, className }: { status: AnalogStatus; className?: string }) {
  if (status === "proposed") return <i className={cn("inline-block h-2 w-2 shrink-0 rotate-45 border-[1.5px] border-primary bg-primary/30", className)} />;
  return <i className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-current", status === "emerging" && "border-dashed", className)} />;
}

interface Props {
  items: { match: Match; rank: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
  targetKey: string;
}

export function RankedList({ items, selectedId, onSelect, onClearFilters, targetKey }: Props) {
  if (items.length === 0) {
    return (
      <div className="relative flex flex-col items-center overflow-hidden rounded-md border border-dashed border-foreground/25 px-6 py-10 text-center" data-testid="status-empty">
        <div className="absolute inset-0 hatch-faint" />
        <div className="relative grid h-12 w-12 place-items-center rounded-full border border-foreground/20 bg-card"><SearchX className="h-5 w-5 text-muted-foreground" /></div>
        <div className="font-display relative mt-3 text-lg font-bold">Nothing clears the bar</div>
        <p className="relative mt-1 max-w-[260px] text-sm text-muted-foreground">
          No Earth site with this status reaches the minimum score. That is itself a finding: this target may need a combination of sites.
        </p>
        <Button size="sm" variant="outline" className="relative mt-4" onClick={onClearFilters} data-testid="button-clear-filters">Clear filters</Button>
      </div>
    );
  }
  return (
    <ol className="space-y-1">
      <AnimatePresence initial={true}>
        {items.map(({ match, rank }, i) => {
          const s = match.site;
          const active = s.id === selectedId;
          const status = s.status ?? "established";
          return (
            <motion.li
              layout
              key={s.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ layout: { type: "spring", stiffness: 380, damping: 36 }, delay: Math.min(i, 12) * 0.03 }}
            >
              <button
                onClick={() => onSelect(s.id)}
                data-testid={`row-site-${s.id}`}
                aria-current={active}
                className={cn(
                  "group relative grid w-full grid-cols-[34px_minmax(0,1fr)_64px] items-center gap-2 overflow-hidden rounded-md border py-2 pl-2 pr-3 text-left transition-all duration-200",
                  active
                    ? "border-secondary bg-secondary text-secondary-foreground shadow-md"
                    : "border-transparent hover:border-foreground/15 hover:bg-card",
                )}
              >
                {active && <motion.span layoutId="rank-rail" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                <span className={cn("text-center font-mono text-lg font-bold leading-none tabular-nums", active ? "text-primary" : rank <= 3 ? "text-foreground" : "text-muted-foreground/70")}>
                  {String(rank).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph status={status} className={active ? "text-secondary-foreground" : "text-foreground/70"} />
                    <span className="truncate text-[13px] font-semibold">{s.name}</span>
                  </div>
                  <div className={cn("mt-0.5 flex items-center gap-1.5 text-[11px]", active ? "text-secondary-foreground/65" : "text-muted-foreground")}>
                    <span className="truncate">{s.region}</span>
                    <span className="opacity-40">/</span>
                    <span className="shrink-0 font-mono text-[10px]">{fmt.lat(s.lat)}</span>
                    {status === "proposed" && <span className="ml-auto shrink-0 rounded-[2px] bg-primary px-1 font-mono text-[8px] uppercase tracking-wider text-primary-foreground">{STATUS_LABEL[status]}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-bold tabular-nums" data-testid={`text-score-${s.id}`}>{match.score.toFixed(1)}</span>
                  <div className={cn("mt-1 h-[3px] w-full overflow-hidden rounded-full", active ? "bg-secondary-foreground/15" : "bg-foreground/10")}>
                    <motion.div
                      key={targetKey}
                      className="h-full origin-left rounded-full"
                      style={{ background: scoreColor(match.score), width: "100%" }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: match.score / 100 }}
                      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: Math.min(i, 12) * 0.03 }}
                    />
                  </div>
                </div>
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
