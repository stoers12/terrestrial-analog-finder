import { motion, AnimatePresence } from "framer-motion";
import { GEOLOGY_LABELS, TARGET_REFERENCE, TARGET_SITES, type Site } from "@/data/sites";
import { fmt } from "@/lib/analog-ui";
import { cn } from "@/lib/utils";

interface Props {
  target: Site;
  onChange: (id: string) => void;
}

const GROUPS: { body: "moon" | "mars"; label: string; facts: string }[] = [
  { body: "moon", label: "Moon", facts: "0.17 g · vacuum" },
  { body: "mars", label: "Mars", facts: "0.38 g · 0.6 kPa CO2" },
];

export function TargetSelector({ target, onChange }: Props) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        {GROUPS.map((g) => (
          <div key={g.body} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="w-24 shrink-0 pt-1.5">
              <div className={cn("font-display text-lg font-extrabold leading-none", g.body === "moon" ? "text-[hsl(var(--moon))]" : "text-[hsl(var(--mars))]")}>{g.label}</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-1">{g.facts}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_SITES.filter((t) => t.body === g.body).map((t) => {
                const active = t.id === target.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    data-testid={`button-target-${t.id}`}
                    className={cn(
                      "relative rounded-[4px] border px-3 py-1.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5",
                      active ? "border-transparent text-white" : "border-foreground/15 bg-card/70 hover:border-foreground/40",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="target-pill"
                        className="absolute inset-0 rounded-[4px]"
                        style={{ background: `hsl(var(--${g.body}))` }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative font-medium">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={target.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="relative overflow-hidden rounded-md border border-foreground/15 bg-secondary p-4 text-secondary-foreground"
          data-testid="card-target"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-body-accent" />
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
              Target · {target.body} · {target.region}
            </div>
            <div className="font-mono text-[10px] opacity-60">{fmt.lat(target.lat)}</div>
          </div>
          <h2 className="font-display mt-1 text-2xl font-extrabold">{target.name}</h2>
          <p className="mt-1 text-sm opacity-90">{target.mission}</p>
          <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-[11px]">
            {[
              ["Mean", fmt.temp(target.meanTempC)],
              ["Coldest", fmt.temp(target.minTempC)],
              ["Air", fmt.kpa(target.pressureKpa)],
              ["Relief", fmt.ten(target.ruggedness)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-sm bg-secondary-foreground/10 px-2 py-1.5">
                <div className="opacity-60 text-[9px] uppercase tracking-widest">{k}</div>
                <div className="font-bold">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug opacity-65" data-testid="text-target-reference">
            Reference data (curated, indicative). {TARGET_REFERENCE[target.body as "moon" | "mars"].values}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {target.geology.map((g) => (
              <span key={g} className="rounded-sm border border-secondary-foreground/25 px-1.5 py-0.5 text-[11px]">{GEOLOGY_LABELS[g]}</span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
