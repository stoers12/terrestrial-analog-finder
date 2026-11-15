import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Crosshair, ExternalLink, Layers, Search, X } from "lucide-react";
import type { Site } from "@/data/sites";
import {
  MOON_RELIEF_URL,
  PIT_ATLAS,
  PIT_SETTINGS,
  fmtDepth,
  fmtDims,
  fmtPitCentre,
  pitSetting,
  type LunarPit,
  type PitSetting,
} from "@/data/pack";
import { LROC_PITS } from "@/data/evidence";
import { cn } from "@/lib/utils";

const MOON_R_KM = 1737.4;
const W = 1440;
const H = 720;
const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

function moonKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * MOON_R_KM * Math.asin(Math.sqrt(h));
}

const settingColor = (s: PitSetting) => PIT_SETTINGS.find((x) => x.id === s)!.color;
const pitRadius = (p: LunarPit) => 4 + Math.min(10, Math.sqrt(p.funnelMaxM ?? p.innerMaxM ?? 20) / 2.2);

type SortKey = "depth" | "size" | "name";

interface Props {
  targetSites: Site[];
  currentTargetId: string;
  onUseTarget: (id: string) => void;
}

export function LunarPitAtlas({ targetSites, currentTargetId, onUseTarget }: Props) {
  const reduceMotion = useReducedMotion();
  const moonTargets = useMemo(() => targetSites.filter((s) => s.body === "moon"), [targetSites]);
  const targetByPit = useMemo(() => new Map(moonTargets.filter((t) => t.lrocPit).map((t) => [t.lrocPit!, t])), [moonTargets]);
  // The two catalogued pits (Marius Hills and Tranquillitatis) sit within about 2 km of their atlas entries.
  const linkedTarget = (p: LunarPit) => targetByPit.get(p.name) ?? moonTargets.find((t) => moonKm(t, p) < 3) ?? null;

  const [settings, setSettings] = useState<Set<PitSetting>>(new Set(PIT_SETTINGS.map((s) => s.id)));
  const [query, setQuery] = useState("");
  const [depthOnly, setDepthOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("depth");
  const [selectedName, setSelectedName] = useState<string>("Mare Tranquillitatis Pit");
  const [hover, setHover] = useState<LunarPit | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  // On narrow screens the detail card sits below the list; bring it into view when a row is chosen.
  const pickFromList = (name: string) => {
    setSelectedName(name);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
    }
  };

  const counts = useMemo(() => {
    const c: Record<PitSetting, number> = { mare: 0, crater: 0, terra: 0 };
    for (const p of PIT_ATLAS.pits) c[pitSetting(p)]++;
    return c;
  }, []);
  const measuredDepth = PIT_ATLAS.pits.filter((p) => p.depthM != null && !p.depthIsLowerBound).length;
  const lowerBound = PIT_ATLAS.pits.filter((p) => p.depthIsLowerBound).length;

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = PIT_ATLAS.pits.filter(
      (p) =>
        settings.has(pitSetting(p)) &&
        (!depthOnly || (p.depthM != null && !p.depthIsLowerBound)) &&
        (!q || p.name.toLowerCase().includes(q) || p.host.toLowerCase().includes(q) || (p.unit?.name.toLowerCase().includes(q) ?? false)),
    );
    const by: Record<SortKey, (a: LunarPit, b: LunarPit) => number> = {
      depth: (a, b) => (b.depthM ?? -1) - (a.depthM ?? -1),
      size: (a, b) => (b.funnelMaxM ?? b.innerMaxM ?? -1) - (a.funnelMaxM ?? a.innerMaxM ?? -1),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [settings, depthOnly, q, sort]);

  const selected = PIT_ATLAS.pits.find((p) => p.name === selectedName) ?? null;
  const selectedVisible = selected && filtered.includes(selected);
  const linked = selected ? linkedTarget(selected) : null;
  const nearest = selected
    ? moonTargets
        .filter((t) => t.id !== linked?.id)
        .map((t) => ({ t, km: moonKm(t, selected) }))
        .sort((a, b) => a.km - b.km)[0]
    : null;
  const unitInfo = selected?.unit ? PIT_ATLAS.units[selected.unit.code] : null;
  const toggleSetting = (id: PitSetting) =>
    setSettings((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });
  const resetFilters = () => {
    setSettings(new Set(PIT_SETTINGS.map((s) => s.id)));
    setQuery("");
    setDepthOnly(false);
  };

  return (
    <section className="overflow-hidden rounded-md border border-foreground/15 bg-secondary text-secondary-foreground" data-testid="section-pit-atlas" aria-labelledby="pit-atlas-title">
      <div className="flex flex-col justify-between gap-4 border-b border-secondary-foreground/10 p-5 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.25em] text-primary">
            <span className="h-px w-6 bg-primary" /> New data · LROC pit atlas × USGS geology
          </div>
          <h2 id="pit-atlas-title" className="font-display mt-2 text-2xl font-extrabold leading-tight md:text-4xl">
            Every catalogued pit on the Moon
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary-foreground/75">
            {PIT_ATLAS.count} pits from the LROC atlas, each placed on the USGS geologic map unit at its centre. Pits in mare basalt are the usual lava-tube candidates; most pits in crater units formed in impact melt.
            Pits linked to a target can be compared with Earth sites directly.
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-2 font-mono text-[11px]" data-testid="stats-pit-atlas">
          {PIT_SETTINGS.map((s) => (
            <div key={s.id} className="min-w-[92px] rounded-sm border border-secondary-foreground/12 bg-secondary-foreground/5 px-2.5 py-2">
              <dt className="flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-wider text-secondary-foreground/60">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" /> {s.label}
              </dt>
              <dd className="mt-0.5 text-xl font-bold tabular-nums">{counts[s.id]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 border-secondary-foreground/10 p-4 xl:border-r">
          {/* Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Geologic setting">
              {PIT_SETTINGS.map((s) => {
                const on = settings.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSetting(s.id)}
                    aria-pressed={on}
                    title={s.hint}
                    data-testid={`button-pit-setting-${s.id}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      on ? "border-secondary-foreground/35 bg-secondary-foreground/10" : "border-secondary-foreground/12 text-secondary-foreground/45 hover:text-secondary-foreground/80",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: on ? s.color : "transparent", boxShadow: `inset 0 0 0 1px ${s.color}` }} aria-hidden="true" />
                    {s.label}
                    <span className="font-mono text-[10px] opacity-60">{counts[s.id]}</span>
                  </button>
                );
              })}
            </div>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-secondary-foreground/75">
              <input type="checkbox" checked={depthOnly} onChange={(e) => setDepthOnly(e.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="checkbox-depth-measured" />
              Measured depth only
            </label>
          </div>

          {/* Map */}
          <div className="relative overflow-hidden rounded-sm border border-secondary-foreground/15 bg-black" data-testid="map-pit-atlas">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Moon map with ${filtered.length} lunar pits`}>
              <image href={MOON_RELIEF_URL} x={0} y={0} width={W} height={H} preserveAspectRatio="none" opacity={0.92} />
              <rect x={0} y={0} width={W} height={H} fill="hsl(222 47% 8% / .25)" />
              {[-60, -30, 0, 30, 60].map((lat) => (
                <line key={`lat${lat}`} x1={0} x2={W} y1={py(lat)} y2={py(lat)} stroke="white" strokeOpacity={lat === 0 ? 0.25 : 0.1} strokeDasharray={lat === 0 ? "" : "4 8"} />
              ))}
              {[-120, -60, 0, 60, 120].map((lon) => (
                <line key={`lon${lon}`} y1={0} y2={H} x1={px(lon)} x2={px(lon)} stroke="white" strokeOpacity={lon === 0 ? 0.25 : 0.1} strokeDasharray={lon === 0 ? "" : "4 8"} />
              ))}
              <rect x={px(-90)} y={0} width={px(90) - px(-90)} height={H} fill="none" stroke="white" strokeOpacity={0.18} strokeDasharray="2 10" />
              <text x={px(0)} y={26} textAnchor="middle" fill="white" fillOpacity={0.6} style={{ font: "600 18px var(--app-font-mono, monospace)", letterSpacing: "0.2em" }}>NEAR SIDE</text>
              <text x={px(-135)} y={26} textAnchor="middle" fill="white" fillOpacity={0.45} style={{ font: "600 18px var(--app-font-mono, monospace)", letterSpacing: "0.2em" }}>FAR SIDE</text>
              <text x={px(135)} y={26} textAnchor="middle" fill="white" fillOpacity={0.45} style={{ font: "600 18px var(--app-font-mono, monospace)", letterSpacing: "0.2em" }}>FAR SIDE</text>

              {filtered.map((p) => {
                const sel = p.name === selectedName;
                return (
                  <circle
                    key={p.name}
                    cx={px(p.lon)}
                    cy={py(p.lat)}
                    r={pitRadius(p)}
                    fill={settingColor(pitSetting(p))}
                    fillOpacity={sel ? 1 : 0.78}
                    stroke={sel ? "white" : "hsl(222 47% 8%)"}
                    strokeWidth={sel ? 3 : 1.2}
                    className="cursor-pointer transition-[fill-opacity] hover:fill-opacity-100"
                    onClick={() => setSelectedName(p.name)}
                    onMouseEnter={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                    data-testid="dot-pit"
                  >
                    <title>{`${p.name} · ${p.host} · ${p.unit?.name ?? "no map unit"}`}</title>
                  </circle>
                );
              })}

              {moonTargets.map((t) => {
                const cur = t.id === currentTargetId;
                return (
                  <g key={t.id} transform={`translate(${px(t.lon)} ${py(t.lat)})`} pointerEvents="none">
                    <circle r={cur ? 17 : 13} fill="none" stroke="white" strokeWidth={cur ? 3 : 1.8} strokeOpacity={cur ? 1 : 0.85} />
                    <circle r={cur ? 17 : 13} fill="none" stroke="hsl(var(--primary))" strokeWidth={cur ? 1.5 : 0} />
                  </g>
                );
              })}

              {selected && selectedVisible && (
                <motion.circle
                  key={selected.name}
                  cx={px(selected.lon)}
                  cy={py(selected.lat)}
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  initial={reduceMotion ? false : { r: pitRadius(selected), opacity: 0.9 }}
                  animate={reduceMotion ? { r: 26, opacity: 0.6 } : { r: [pitRadius(selected), 34], opacity: [0.9, 0] }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  pointerEvents="none"
                />
              )}
            </svg>

            <AnimatePresence>
              {hover && (
                <motion.div
                  key={hover.name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="pointer-events-none absolute left-3 top-10 max-w-[260px] rounded-sm border border-white/15 bg-black/75 px-2.5 py-1.5 text-[11px] text-white backdrop-blur"
                >
                  <div className="font-semibold">{hover.name}</div>
                  <div className="text-white/70">{hover.host} · {hover.unit?.name ?? "no map unit"}</div>
                  <div className="font-mono text-white/80">funnel {fmtDims(hover.funnelMaxM, hover.funnelMinM)} · depth {fmtDepth(hover)}</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pointer-events-none absolute bottom-2 left-2 hidden flex-wrap sm:flex items-center gap-x-3 gap-y-1 rounded-sm bg-black/60 px-2 py-1 text-[10px] text-white/85 backdrop-blur">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-white" aria-hidden="true" /> App target (ring)</span>
              <span>Dot size: funnel diameter</span>
              <span className="font-mono">{filtered.length} / {PIT_ATLAS.count} shown</span>
            </div>
            <div className="pointer-events-none absolute bottom-2 right-2 hidden rounded-sm lg:block bg-black/60 px-2 py-1 font-mono text-[9px] text-white/70">
              Relief: LRO LOLA LDEM 4 px/deg · equirectangular
            </div>
          </div>

          <p className="mt-1.5 text-[10px] text-secondary-foreground/55 sm:hidden">
            {filtered.length} / {PIT_ATLAS.count} shown · rings are app targets · dot size is funnel diameter · relief from LRO LOLA
          </p>

          {/* List */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-foreground/50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a pit, host crater or map unit"
                className="h-8 w-full rounded-sm border border-secondary-foreground/20 bg-secondary-foreground/5 pl-8 pr-2 text-xs text-secondary-foreground placeholder:text-secondary-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="input-pit-search"
                aria-label="Search pits"
              />
            </div>
            <div className="flex rounded-sm bg-secondary-foreground/8 p-0.5 text-[11px]" role="group" aria-label="Sort pits">
              {(["depth", "size", "name"] as SortKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  aria-pressed={sort === k}
                  className={cn("rounded-[3px] px-2 py-1 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", sort === k ? "bg-secondary-foreground text-secondary" : "text-secondary-foreground/65 hover:text-secondary-foreground")}
                  data-testid={`button-pit-sort-${k}`}
                >
                  {k === "depth" ? "Deepest" : k === "size" ? "Widest" : "A–Z"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 max-h-[260px] overflow-y-auto rounded-sm border border-secondary-foreground/10">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-secondary-foreground/70" data-testid="empty-pit-list">
                <Crosshair className="h-5 w-5 opacity-60" />
                No pit matches these filters.
                <button type="button" onClick={resetFilters} className="rounded-sm border border-secondary-foreground/25 px-2.5 py-1 text-secondary-foreground hover:border-secondary-foreground/60" data-testid="button-pit-reset">
                  Clear filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-secondary font-mono text-[9px] uppercase tracking-wider text-secondary-foreground/55">
                  <tr>
                    <th className="px-2.5 py-1.5 font-normal">Pit</th>
                    <th className="hidden px-2 py-1.5 font-normal sm:table-cell">Map unit</th>
                    <th className="px-2 py-1.5 text-right font-normal">Funnel</th>
                    <th className="px-2.5 py-1.5 text-right font-normal">Depth</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const sel = p.name === selectedName;
                    const t = linkedTarget(p);
                    return (
                      <tr
                        key={p.name}
                        onClick={() => pickFromList(p.name)}
                        className={cn("cursor-pointer border-t border-secondary-foreground/8 transition-colors", sel ? "bg-primary/20" : "hover:bg-secondary-foreground/5")}
                        data-testid="row-pit"
                      >
                        <td className="px-2.5 py-1.5">
                          <button type="button" onClick={(e) => { e.stopPropagation(); pickFromList(p.name); }} className="flex items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-pressed={sel}>
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: settingColor(pitSetting(p)) }} aria-hidden="true" />
                            <span className="font-medium">{p.name}</span>
                            {t && <span className="rounded-sm bg-primary px-1 font-mono text-[8px] uppercase tracking-wider text-primary-foreground">Target</span>}
                          </button>
                        </td>
                        <td className="hidden px-2 py-1.5 text-secondary-foreground/70 sm:table-cell">{p.unit?.name ?? "n/a"}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums">{p.funnelMaxM == null ? "n/a" : `${p.funnelMaxM} m`}</td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-mono tabular-nums">{p.depthM == null ? "n/a" : `${p.depthIsLowerBound ? ">" : ""}${p.depthM} m`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail */}
        <aside ref={detailRef} className="scroll-mt-20 p-4" aria-live="polite">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.name}
                initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
                data-testid="card-pit-detail"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-secondary-foreground/55">
                    <span className="h-2 w-2 rounded-full" style={{ background: settingColor(pitSetting(selected)) }} aria-hidden="true" />
                    {PIT_SETTINGS.find((s) => s.id === pitSetting(selected))!.label} · {selected.host}
                  </div>
                  <h3 className="font-display mt-1 text-2xl font-extrabold leading-tight" data-testid="text-pit-name">{selected.name}</h3>
                  <div className="font-mono text-[11px] text-secondary-foreground/60">{fmtPitCentre(selected)}</div>
                  {!selectedVisible && <div className="mt-1 text-[10px] text-primary">Hidden on the map by the current filters.</div>}
                </div>

                <dl className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  {(
                    [
                      ["Funnel", fmtDims(selected.funnelMaxM, selected.funnelMinM)],
                      ["Inner opening", fmtDims(selected.innerMaxM, selected.innerMinM)],
                      ["Depth", fmtDepth(selected)],
                      ["Nearest app target", nearest ? `${Math.round(nearest.km).toLocaleString("en-US")} km` : "n/a"],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-sm bg-secondary-foreground/8 px-2 py-1.5">
                      <dt className="font-sans text-[9px] uppercase tracking-wider text-secondary-foreground/55">{k}</dt>
                      <dd className="mt-0.5 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                {selected.depthIsLowerBound && <p className="text-[10px] text-secondary-foreground/65">The atlas gives this depth as a lower bound ("&gt;"), not a measurement.</p>}

                {selected.unit && unitInfo && (
                  <div className="rounded-sm border border-secondary-foreground/12 p-2.5 text-[11px] leading-snug" data-testid="text-pit-unit">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-secondary-foreground/55">
                      <Layers className="h-3 w-3" /> USGS map unit at the pit centre
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 h-3 w-3 shrink-0 rounded-[2px] border border-secondary-foreground/30" style={{ background: unitInfo.color ?? "transparent" }} aria-hidden="true" />
                      <div>
                        <b>{unitInfo.name}</b> <span className="font-mono text-secondary-foreground/60">({selected.unit.code}, {unitInfo.period})</span>
                        {unitInfo.interpretation && <div className="mt-0.5 text-secondary-foreground/80">Interpreted as: {unitInfo.interpretation}</div>}
                        {unitInfo.description && <div className="mt-0.5 text-secondary-foreground/60">{unitInfo.description}</div>}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] text-secondary-foreground/50">At 1:5,000,000 the unit describes the surrounding terrain, not the pit itself.</p>
                  </div>
                )}

                {linked ? (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => onUseTarget(linked.id)}
                      disabled={linked.id === currentTargetId}
                      className="group flex w-full items-center justify-between gap-2 rounded-sm bg-primary px-3 py-2.5 text-left text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:translate-y-0 disabled:opacity-60"
                      data-testid="button-use-pit-target"
                    >
                      {linked.id === currentTargetId ? "This is the current target" : `Find Earth analogs for ${linked.name}`}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                    <p className="text-[10px] text-secondary-foreground/55">Temperature and relief for this target come from the Diviner and LOLA pipeline.</p>
                  </div>
                ) : (
                  <p className="rounded-sm border border-dashed border-secondary-foreground/20 p-2.5 text-[11px] text-secondary-foreground/65" data-testid="text-pit-not-target">
                    Not a comparison target in this version: the pipeline has not measured its temperature or relief, so no Earth ranking is shown for it.
                    {nearest && <> The nearest target is <b className="text-secondary-foreground">{nearest.t.name}</b>.</>}
                  </p>
                )}
                <p className="text-[10px] text-secondary-foreground/50">A pit is a surface opening; its size does not show whether a lava tube continues below it, or how far.</p>
              </motion.div>
            ) : (
              <div className="grid h-full min-h-[200px] place-items-center rounded-sm border border-dashed border-secondary-foreground/20 p-6 text-center text-xs text-secondary-foreground/60">
                <div>
                  <Crosshair className="mx-auto mb-2 h-5 w-5" /> Select a pit on the map or in the list.
                </div>
              </div>
            )}
          </AnimatePresence>
          <div className="mt-4 border-t border-secondary-foreground/10 pt-3 text-[10px] leading-relaxed text-secondary-foreground/50">
            {measuredDepth} pits have a measured depth and {lowerBound} only a lower bound. Sources:{" "}
            <a href={LROC_PITS.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline decoration-secondary-foreground/30">LROC pit atlas <ExternalLink className="h-2.5 w-2.5" /></a>,{" "}
            <a href={PIT_ATLAS.unitSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline decoration-secondary-foreground/30">USGS unified geologic map <ExternalLink className="h-2.5 w-2.5" /></a>.
            {selected && (
              <button type="button" onClick={() => setSelectedName("")} className="ml-1 inline-flex items-center gap-0.5 underline decoration-secondary-foreground/30" data-testid="button-pit-clear">
                <X className="h-2.5 w-2.5" /> Clear selection
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
