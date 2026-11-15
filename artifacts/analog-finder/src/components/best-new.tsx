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
  const bars = [
    { label: "Proposed", name: best.site.name, score: best.score, strong: true },
    ...(est ? [{ label: "Established", name: est.site.name, score: est.score, strong: false }] : []),
  ];
  return (
    <motion.button
      key={best.site.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onSelect(best.site.id)}
      data-testid="card-best-new"
      className="group relative w-full overflow-hidden rounded-lg bg-primary p-4 text-left text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 hatch-light opacity-60" />
      <div className="absolute -right-10 -top-10 h-32 w-32 rotate-45 border-[12px] border-primary-foreground/15" />
      <div className="relative">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] opacity-85">
          <span>Best new analog</span>
          <span>rank {idx + 1}/{ranked.length}</span>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-xl font-extrabold leading-tight">{best.site.name}</div>
            <div className="text-xs opacity-85">{best.site.region}</div>
          </div>
          <div className="font-mono text-3xl font-bold leading-none tabular-nums">{best.score.toFixed(1)}</div>
        </div>
        <div className="mt-3 space-y-1.5">
          {bars.map((b) => (
            <div key={b.label} className="grid grid-cols-[72px_minmax(0,1fr)_34px] items-center gap-2 text-[10px]">
              <span className="font-mono uppercase tracking-wider opacity-80">{b.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/20">
                <motion.div className={b.strong ? "h-full bg-primary-foreground" : "h-full bg-primary-foreground/55"} initial={{ width: 0 }} animate={{ width: `${b.score}%` }} transition={{ duration: 0.8 }} />
              </div>
              <span className="text-right font-mono tabular-nums">{b.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
        {est && (
          <div className="mt-3 border-t border-primary-foreground/25 pt-2 text-xs leading-snug">
            {diff >= 0 ? (
              <>Beats the best established site, {est.site.name} ({est.score.toFixed(1)}), by <b className="font-mono">{diff.toFixed(1)}</b> points.</>
            ) : (
              <>Trails the best established site, {est.site.name} ({est.score.toFixed(1)}), by <b className="font-mono">{Math.abs(diff).toFixed(1)}</b> points.</>
            )}
          </div>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">Compare <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </motion.button>
  );
}
