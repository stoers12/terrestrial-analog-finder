import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GEOLOGY_LABELS, TARGET_REFERENCE, type Site } from "@/data/sites";
import { KindBadge, formatDate } from "@/components/target-provenance";
import { fmt } from "@/lib/analog-ui";
import { TargetEvidence } from "@/components/evidence-panel";
import { cn } from "@/lib/utils";

interface Props {
  target: Site;
  targetSites: Site[];
  onChange: (id: string) => void;
}

const WORLDS: { body: "moon" | "mars"; label: string; facts: string; descriptor: string }[] = [
  { body: "moon", label: "Moon", facts: "0.17 g · vacuum", descriptor: "Lunar field sites" },
  { body: "mars", label: "Mars", facts: "0.38 g · 0.6 kPa CO₂", descriptor: "Martian field sites" },
];

export function TargetSelector({ target, targetSites, onChange }: Props) {
  const reduceMotion = useReducedMotion();
  const worlds = WORLDS.map((world) => ({
    ...world,
    sites: targetSites.filter((site) => site.body === world.body),
  }));
  const activeWorld = worlds.find((world) => world.body === target.body);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="space-y-3" data-testid="target-world-selector">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose destination world">
          {worlds.map((world) => {
            const active = world.body === target.body;
            const firstSite = world.sites[0];
            return (
              <button
                key={world.body}
                type="button"
                onClick={() => firstSite && onChange(active ? target.id : firstSite.id)}
                data-testid={`button-world-${world.body}`}
                aria-pressed={active}
                className={cn(
                  "group relative flex min-h-[74px] min-w-[142px] flex-1 items-center gap-3 overflow-hidden rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active ? "border-body-accent bg-secondary text-secondary-foreground" : "border-foreground/15 bg-card/60 hover:border-foreground/35",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-world-frame"
                    className="absolute inset-0 border-l-2 border-body-accent bg-secondary"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 34 }}
                  />
                )}
                <motion.span
                  className={cn("relative grid h-10 w-10 shrink-0 place-items-center rounded-full border", world.body === "moon" ? "border-[hsl(var(--moon)/.55)] bg-[radial-gradient(circle_at_34%_30%,hsl(228_28%_75%),hsl(228_22%_48%)_50%,hsl(222_28%_21%)_100%)]" : "border-[hsl(var(--mars)/.6)] bg-[radial-gradient(circle_at_34%_30%,hsl(18_65%_70%),hsl(8_53%_46%)_54%,hsl(3_48%_24%)_100%)]")}
                  animate={active && !reduceMotion ? { rotate: 360 } : { rotate: 0 }}
                  transition={active && !reduceMotion ? { repeat: Infinity, duration: 28, ease: "linear" } : { duration: 0.2 }}
                  aria-hidden="true"
                >
                  <span className="absolute inset-[4px] rounded-full border border-secondary-foreground/25 border-t-transparent" />
                  <span className="absolute left-[8px] top-[10px] h-2 w-2 rounded-full bg-secondary-foreground/15" />
                </motion.span>
                <span className="relative min-w-0">
                  <span className={cn("block font-display text-lg font-extrabold leading-none", world.body === "moon" ? "text-[hsl(var(--moon))]" : "text-[hsl(var(--mars))]", active && "text-secondary-foreground")}>{world.label}</span>
                  <span className={cn("mt-1 block font-mono text-[9px] uppercase tracking-wider", active ? "text-secondary-foreground/65" : "text-muted-foreground")}>{world.facts}</span>
                </span>
                <span className="relative ml-auto hidden font-mono text-[8px] uppercase tracking-widest opacity-60 sm:block">{active ? "Selected" : "Select"}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-md border border-foreground/15 bg-card/55 p-3.5" data-testid="group-target-sites">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">{activeWorld?.descriptor ?? "Target sites"}</div>
              <div className="font-display text-sm font-bold">Select a target site</div>
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">{activeWorld?.sites.length ?? 0} available</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeWorld?.sites.map((site) => {
              const active = site.id === target.id;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onChange(site.id)}
                  data-testid={`button-target-${site.id}`}
                  aria-pressed={active}
                  className={cn(
                    "relative rounded-[4px] border px-3 py-1.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active ? "border-transparent text-white" : "border-foreground/15 bg-background/55 hover:border-foreground/40",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="target-pill"
                      className="absolute inset-0 rounded-[4px]"
                      style={{ background: `hsl(var(--${target.body}))` }}
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative font-medium">{site.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={target.id}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.28 }}
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
            {(
              [
                ["Mean", fmt.temp(target.meanTempC), target.targetData!.values.meanTempC.kind],
                ["Coldest", fmt.temp(target.minTempC), target.targetData!.values.minTempC.kind],
                ["Air", fmt.kpa(target.pressureKpa), target.targetData!.values.pressureKpa.kind],
                ["Relief", fmt.ten(target.ruggedness), target.targetData!.values.reliefM.kind],
              ] as const
            ).map(([k, v, kind]) => (
              <div key={k} className="rounded-sm bg-secondary-foreground/10 px-2 py-1.5">
                <div className="opacity-60 text-[9px] uppercase tracking-widest">{k}</div>
                <div className="font-bold">{v}</div>
                <KindBadge kind={kind} className="mt-1 inline-block text-[8px]" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug opacity-65" data-testid="text-target-reference">
            {TARGET_REFERENCE[target.body as "moon" | "mars"].values} Processed {formatDate(target.targetData!.values.meanTempC.processedAt)}. Coldest is the mean of the coldest 10% of night samples; relief is the height range of 9 samples (the point and 8 neighbours 15 km away).
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {target.geology.map((g) => (
              <span key={g} className="rounded-sm border border-secondary-foreground/25 px-1.5 py-0.5 text-[11px]">{GEOLOGY_LABELS[g]}</span>
            ))}
          </div>
          <TargetEvidence target={target} />
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
