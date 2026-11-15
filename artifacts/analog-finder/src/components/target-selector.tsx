import { motion, AnimatePresence } from "framer-motion";
import { GEOLOGY_LABELS, TARGET_REFERENCE, type Site } from "@/data/sites";
import { formatDate } from "@/components/target-provenance";
import { ProvTag } from "@/components/instrument";
import { fmt } from "@/lib/analog-ui";
import { cn } from "@/lib/utils";

interface Props {
  target: Site;
  targetSites: Site[];
  onChange: (id: string) => void;
}

const GROUPS: { body: "moon" | "mars"; label: string; facts: [string, string][] }[] = [
  { body: "moon", label: "Moon", facts: [["g", "0.17"], ["air", "vacuum"]] },
  { body: "mars", label: "Mars", facts: [["g", "0.38"], ["air", "0.6 kPa CO2"]] },
];

function Planet({ body, active }: { body: "moon" | "mars"; active: boolean }) {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <div className={cn("planet h-full w-full rounded-full", body === "moon" ? "planet-moon" : "planet-mars")} />
      {active && (
        <motion.div className="absolute -inset-1.5 rounded-full border border-dashed border-foreground/40" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }} />
      )}
    </div>
  );
}

export function TargetSelector({ target, targetSites, onChange }: Props) {
  const tv = target.targetData!.values;
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" data-testid="panel-target-selector">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {GROUPS.map((g) => {
          const sites = targetSites.filter((t) => t.body === g.body);
          const siteGroups = [
            { id: "catalogued", label: "Catalogued sites", sites: sites.filter((site) => !site.lrocPit) },
            { id: "lroc", label: "Pits added from the LROC atlas", sites: sites.filter((site) => Boolean(site.lrocPit)) },
          ].filter((group) => group.sites.length > 0);
          const bodyActive = target.body === g.body;
          return (
            <div key={g.body} className={cn("panel rounded-lg border bg-card/85 p-3 transition-colors", bodyActive ? "border-foreground/25" : "border-foreground/10")}>
              <div className="mb-2.5 flex items-center gap-3">
                <Planet body={g.body} active={bodyActive} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Destination</div>
                  <div className={cn("font-display text-xl font-extrabold leading-none", g.body === "moon" ? "text-[hsl(var(--moon))]" : "text-[hsl(var(--mars))]")}>{g.label}</div>
                </div>
                <div className="flex gap-3 font-mono text-[10px]">
                  {g.facts.map(([k, v]) => (
                    <div key={k} className="text-right">
                      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{k}</div>
                      <div className="font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {siteGroups.map((group) => (
                  <div key={group.id}>
                    {g.body === "moon" && siteGroups.length > 1 && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className={cn("font-mono text-[9px] uppercase tracking-[.18em]", group.id === "lroc" ? "text-primary" : "text-muted-foreground")}>{group.label}</span>
                        <span className="h-px flex-1 bg-foreground/10" />
                        <span className="font-mono text-[9px] text-muted-foreground">{group.sites.length}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {group.sites.map((t, i) => {
                  const active = t.id === target.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onChange(t.id)}
                      data-testid={`button-target-${t.id}`}
                      className={cn(
                        "group relative overflow-hidden rounded-md border px-2.5 py-2 text-left transition-all duration-200",
                        active ? "border-transparent text-white shadow-md" : group.id === "lroc" ? "border-dashed border-primary/45 bg-background/50 hover:-translate-y-0.5 hover:border-primary hover:bg-card" : "border-foreground/10 bg-background/50 hover:-translate-y-0.5 hover:border-foreground/35 hover:bg-card",
                      )}
                    >
                      {active && (
                        <motion.span layoutId="target-pill" className="absolute inset-0" style={{ background: `hsl(var(--${g.body}))` }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                      )}
                      <span className="relative block">
                        <span className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest opacity-60">
                          <span>{g.label.slice(0, 2)}-{String(i + 1).padStart(2, "0")}</span>
                          <span>{fmt.lat(t.lat)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] font-semibold leading-tight">{t.name}</span>
                        <span className="mt-1 flex items-center gap-2 font-mono text-[10px]">
                          <span className={active ? "opacity-90" : "text-muted-foreground"}>{fmt.temp(t.meanTempC)}</span>
                          <span className="opacity-40">/</span>
                          <span className={active ? "opacity-90" : "text-muted-foreground"}>relief {fmt.ten(t.ruggedness)}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground md:col-span-2 xl:col-span-1">
          <span>Card values are pipeline output:</span>
          <ProvTag kind={tv.meanTempC.kind} compact /> <span>mean temperature,</span>
          <ProvTag kind={tv.reliefM.kind} compact /> <span>relief.</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={target.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="relative overflow-hidden rounded-lg bg-secondary p-5 text-secondary-foreground shadow-lg"
          data-testid="card-target"
        >
          <div className="pointer-events-none absolute inset-0 dossier-grid opacity-60" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-secondary-foreground/10" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-dashed border-secondary-foreground/15" />
          <div className="absolute left-0 top-0 h-full w-1 bg-body-accent" />
          <div className="relative">
            <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.24em] opacity-60">
              <span>Selected target / {target.body} / {target.region}</span>
              <span>{fmt.lat(target.lat)} {Math.abs(target.lon).toFixed(1)}° {target.lon >= 0 ? "E" : "W"}</span>
            </div>
            <h2 className="font-display mt-1 text-3xl font-extrabold leading-tight">{target.name}</h2>
            <p className="mt-1 max-w-md text-sm opacity-85">{target.mission}</p>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-secondary-foreground/15 font-mono sm:grid-cols-4">
              {(
                [
                  ["Mean", fmt.temp(target.meanTempC), tv.meanTempC.kind],
                  ["Coldest", fmt.temp(target.minTempC), tv.minTempC.kind],
                  ["Air", fmt.kpa(target.pressureKpa), tv.pressureKpa.kind],
                  ["Relief", fmt.ten(target.ruggedness), tv.reliefM.kind],
                ] as const
              ).map(([k, v, kind]) => (
                <div key={k} className="bg-secondary px-2.5 py-2">
                  <div className="text-[9px] uppercase tracking-widest opacity-55">{k}</div>
                  <div className="text-lg font-bold leading-tight">{v}</div>
                  <ProvTag kind={kind} compact className="mt-1 on-dark" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-snug opacity-65" data-testid="text-target-reference">
              {TARGET_REFERENCE[target.body as "moon" | "mars"].values} Processed {formatDate(tv.meanTempC.processedAt)}. Coldest is the mean of the coldest 10% of night samples; relief is the height range within about 15 km.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {target.geology.map((g) => (
                <span key={g} className="rounded-[3px] border border-secondary-foreground/25 px-1.5 py-0.5 text-[11px]">{GEOLOGY_LABELS[g]}</span>
              ))}
              <ProvTag kind="editorial" compact className="on-dark ml-1" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
