import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Match } from "@/lib/similarity";

interface Props {
  ranked: Match[];
  onSelect: (id: string) => void;
}

export function BestNew({ ranked, onSelect }: Props) {
  const idx = ranked.findIndex((m) => m.site.status === "proposed");
  const est = ranked.find((m) => m.site.status === "established");
  if (idx < 0) return null;
  const best = ranked[idx];
  const diff = est ? best.score - est.score : 0;
  return (
    <motion.button
      key={best.site.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onSelect(best.site.id)}
      data-testid="card-best-new"
      className="group relative w-full overflow-hidden rounded-md bg-primary p-4 text-left text-primary-foreground transition-transform hover:-translate-y-0.5"
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rotate-45 border-[10px] border-primary-foreground/15" />
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-80">Best new analog · discovery</div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <div className="font-display text-xl font-extrabold leading-tight">{best.site.name}</div>
        <div className="font-mono text-2xl font-bold tabular-nums">{best.score.toFixed(1)}</div>
      </div>
      <div className="text-xs opacity-85">{best.site.region} · rank {idx + 1} of {ranked.length}</div>
      {est && (
        <div className="mt-3 border-t border-primary-foreground/25 pt-2 text-xs">
          {diff >= 0 ? (
            <>Beats the best established site, {est.site.name} ({est.score.toFixed(1)}), by <b className="font-mono">{diff.toFixed(1)}</b> points.</>
          ) : (
            <>Trails the best established site, {est.site.name} ({est.score.toFixed(1)}), by <b className="font-mono">{Math.abs(diff).toFixed(1)}</b> points.</>
          )}
        </div>
      )}
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">Compare <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" /></span>
    </motion.button>
  );
}
