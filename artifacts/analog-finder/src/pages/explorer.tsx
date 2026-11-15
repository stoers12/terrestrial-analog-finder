import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Loader2, TriangleAlert } from "lucide-react";
import type { AnalogStatus, Site } from "@/data/sites";
import { useTargetSites, type TargetsData } from "@/hooks/use-target-sites";
import { useEarthSites, useGrid } from "@/hooks/use-earth-sites";
import { cellKey, findDiscoveries, scoreGrid } from "@/lib/discoveries";
import { Discoveries } from "@/components/discoveries";
import { DiscoveryDetail } from "@/components/discovery-detail";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEIGHTS, rankAnalogs, type DimensionKey, type Weights } from "@/lib/similarity";
import { TargetSelector } from "@/components/target-selector";
import { AnalogMap } from "@/components/analog-map";
import { RankedList } from "@/components/ranked-list";
import { WeightsPanel } from "@/components/weights-panel";
import { SiteDetail } from "@/components/site-detail";
import { BestNew } from "@/components/best-new";
import { CoverageMatrix } from "@/components/coverage-matrix";
import { LunarPitAtlas } from "@/components/lunar-pit-atlas";
import { LITHOLOGY } from "@/data/evidence";
import { AboutDialog } from "@/components/about-dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Filter = "all" | AnalogStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "proposed", label: "Proposed" },
  { id: "emerging", label: "Emerging" },
  { id: "established", label: "Established" },
];

export default function Explorer() {
  const earth = useEarthSites();
  const targets = useTargetSites();
  const sites = earth.sites;
  const isLoading = earth.isLoading || targets.isLoading;
  const error = earth.error ?? targets.error;

  useEffect(() => {
    document.title = "Live Explorer | Terrestrial Analog Finder";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Live research workspace to compute, map, and rank Earth field sites against specific Moon or Mars missions.");
  }, []);

  const refetch = () => {
    if (earth.error) earth.refetch();
    if (targets.error) targets.refetch();
  };

  if (!sites || !targets.data) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-secondary p-6 text-secondary-foreground" data-testid="status-loading-sites">
        <div className="max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-secondary-foreground/20 bg-secondary-foreground/5">
            {error ? <TriangleAlert className="h-6 w-6 text-primary" /> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          </div>
          {error ? (
            <>
              <div className="font-display mt-4 text-2xl font-bold">Could not load measured data</div>
              <p className="mt-2 text-sm opacity-80">{error.message}</p>
              <Button className="mt-5" onClick={refetch} data-testid="button-retry">Try again</Button>
            </>
          ) : (
            <>
              <div className="font-mono mt-4 text-[11px] uppercase tracking-[0.3em] opacity-70">
                {isLoading ? "Loading live research data" : "Preparing the field planner"}
              </div>
              <p className="mt-2 text-sm leading-relaxed opacity-80">Pulling climate from NASA POWER, elevation from a global terrain model, and processed Moon and Mars values from the data pipeline. The first visit can take a few seconds.</p>
              <div className="mx-auto mt-6 h-1 max-w-[220px] overflow-hidden rounded-full bg-secondary-foreground/15">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return <ExplorerLoaded earthSites={sites} targets={targets.data} />;
}

function ExplorerLoaded({ earthSites, targets }: { earthSites: Site[]; targets: TargetsData }) {
  const targetSites = targets.sites;
  const [targetId, setTargetId] = useState(targetSites[0].id);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [minScore, setMinScore] = useState(0);
  const reduceMotion = useReducedMotion();

  const target = targetSites.find((t) => t.id === targetId) ?? targetSites[0];
  const ranked = useMemo(() => rankAnalogs(target, weights, earthSites), [target, weights, earthSites]);
  const withRank = useMemo(() => ranked.map((match, i) => ({ match, rank: i + 1 })), [ranked]);
  const visible = useMemo(
    () => withRank.filter(({ match }) => (filter === "all" || match.site.status === filter) && match.score >= minScore),
    [withRank, filter, minScore],
  );

  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const grid = useGrid();
  const cells = grid.data?.cells;
  const scored = useMemo(() => (cells ? scoreGrid(target, cells, weights) : null), [cells, target, weights]);
  // Rock type (GLiM) narrows which cells may become leads. It is a filter only and never changes a score.
  const [rockClass, setRockClass] = useState<string>("all");
  const rockOptions = useMemo(() => {
    const n = new Map<string, number>();
    for (const c of cells ?? []) {
      const code = LITHOLOGY.cells[`${c.lat},${c.lon}`];
      if (code) n.set(code, (n.get(code) ?? 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, name: LITHOLOGY.classes[code] ?? code, count }));
  }, [cells]);
  const discoveries = useMemo(() => {
    if (!scored) return [];
    const pool = rockClass === "all" ? scored : scored.filter((c) => LITHOLOGY.cells[`${c.cell.lat},${c.cell.lon}`] === rockClass);
    return findDiscoveries(pool, earthSites);
  }, [scored, earthSites, rockClass]);
  const activeDiscovery = discoveries.findIndex((d) => cellKey(d.cell) === selectedCell);

  const effectiveId = selectedId ?? visible[0]?.match.site.id ?? ranked[0]?.site.id ?? null;
  const selected = withRank.find((r) => r.match.site.id === effectiveId) ?? null;

  const changeTarget = (id: string) => {
    setTargetId(id);
    setSelectedId(null);
    setSelectedCell(null);
  };
  const pickSite = (id: string) => {
    setSelectedId(id);
    setSelectedCell(null);
  };

  return (
    <div data-body={target.body} className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="group flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-home">
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Compass className="h-4 w-4 text-primary" />
              <motion.span className="absolute inset-[3px] rounded-full border border-body-accent/60 border-t-transparent" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }} />
            </div>
            <div>
              <div className="font-display text-base font-extrabold leading-none sm:text-lg">Terrestrial Analog Finder</div>
              <div className="hidden font-mono text-[9px] uppercase tracking-[0.19em] text-muted-foreground sm:block">Planetary field rehearsal</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-foreground/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:inline-flex">Independent · Space Apps 2026</span>
            <AboutDialog pipeline={targets} />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section id="explorer" className="bg-background/55">
          <div className="mx-auto max-w-[1500px] px-4 py-10 md:px-6 md:py-14">
            <div className="mb-7 flex flex-col justify-between gap-5 border-b border-foreground/10 pb-6 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.25em] text-primary"><span className="h-px w-6 bg-primary" /> Research workspace</div>
                <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight md:text-5xl">Choose a world. Find a field site.</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Select a target to recompute the Earth ranking, map, and global-grid leads. Every fit index depends on the weights you set and is a rehearsal-comparison aid, not evidence of equivalence or mission safety.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start rounded-sm border border-foreground/15 bg-card/70 px-3 py-2 font-mono text-[10px] uppercase tracking-widest md:self-auto">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                Live calculations
              </div>
            </div>

            <TargetSelector target={target} targetSites={targetSites} onChange={changeTarget} />

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-6">
                <AnalogMap
                  matches={visible}
                  selectedId={selectedCell ? null : effectiveId}
                  onSelect={pickSite}
                  heat={scored}
                  cellSizeDeg={grid.data?.status.cellSizeDeg ?? 4}
                  showHeat={showHeat}
                  onToggleHeat={setShowHeat}
                  discoveries={discoveries}
                  selectedCellKey={selectedCell}
                  onSelectCell={setSelectedCell}
                />
                {activeDiscovery >= 0 && grid.data ? (
                  <DiscoveryDetail
                    target={target}
                    discovery={discoveries[activeDiscovery]}
                    rank={activeDiscovery + 1}
                    climateSource={grid.data.climateSource}
                    elevationSource={grid.data.elevationSource}
                    cellSizeDeg={grid.data.status.cellSizeDeg}
                  />
                ) : (
                  <SiteDetail target={target} match={selected?.match ?? null} rank={selected?.rank ?? 0} />
                )}
              </div>

              <aside className="space-y-4">
                <BestNew ranked={ranked} onSelect={pickSite} />
                <Discoveries
                  discoveries={discoveries}
                  progress={grid.data?.status ?? null}
                  loadError={grid.error as Error | null}
                  selectedKey={selectedCell}
                  onSelect={setSelectedCell}
                  rockOptions={rockOptions}
                  rockClass={rockClass}
                  onRockClass={(c) => {
                    setRockClass(c);
                    setSelectedCell(null);
                  }}
                />
                <section className="rounded-md border border-foreground/15 bg-card/70 p-3">
                  <div className="mb-3 flex items-baseline justify-between px-1">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Fit index under current weights</div>
                      <h3 className="font-display text-lg font-bold">Earth ranking</h3>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground" data-testid="text-visible-count">{visible.length} / {ranked.length} sites</span>
                  </div>
                  <div className="mb-3 grid grid-cols-4 gap-1 rounded-[5px] bg-muted p-1">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        data-testid={`button-filter-${f.id}`}
                        aria-pressed={filter === f.id}
                        className={cn("relative rounded-[3px] px-1 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", filter === f.id ? "text-secondary-foreground" : "text-muted-foreground hover:text-foreground")}
                      >
                        {filter === f.id && <motion.span layoutId="filter-pill" className={cn("absolute inset-0 rounded-[3px]", f.id === "proposed" ? "bg-primary" : "bg-secondary")} />}
                        <span className="relative">{f.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 px-1">
                    <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                      <label htmlFor="min-score">Minimum fit index</label><span className="font-mono">{minScore}</span>
                    </div>
                    <Slider id="min-score" value={[minScore]} min={0} max={90} step={1} onValueChange={(v) => setMinScore(v[0])} data-testid="slider-min-score" />
                  </div>
                  <div className="max-h-[560px] overflow-y-auto pr-1">
                    <RankedList
                      items={visible}
                      selectedId={effectiveId}
                      onSelect={pickSite}
                      targetKey={target.id}
                      statusLabel={filter === "all" ? null : FILTERS.find((f) => f.id === filter)!.label}
                      minScore={minScore}
                      bestForStatus={withRank.find(({ match }) => filter === "all" || match.site.status === filter)?.match.score ?? null}
                      onClearFilters={() => {
                        setFilter("all");
                        setMinScore(0);
                      }}
                    />
                  </div>
                </section>
                <WeightsPanel
                  weights={weights}
                  onChange={(k: DimensionKey, v: number) => setWeights((w) => ({ ...w, [k]: v }))}
                  onReset={() => setWeights(DEFAULT_WEIGHTS)}
                />
              </aside>
            </div>

            <div className="mt-8">
              <LunarPitAtlas
                targetSites={targetSites}
                currentTargetId={target.id}
                onUseTarget={(id) => {
                  changeTarget(id);
                  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                }}
              />
            </div>

            <div className="mt-8">
              <CoverageMatrix
                earthSites={earthSites}
                targetSites={targetSites}
                weights={weights}
                targetId={target.id}
                selectedId={effectiveId}
                onPick={(t, s) => {
                  setTargetId(t);
                  setSelectedId(s);
                  setSelectedCell(null);
                  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                }}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-[1500px] flex-wrap justify-between gap-3 px-4 py-6 text-xs md:px-6">
          <span className="max-w-4xl leading-relaxed text-secondary-foreground/65">Built independently for NASA Space Apps Challenge 2026. Earth climate from NASA POWER, terrain from a global DEM, imagery from NASA GIBS. Moon and Mars values come from planetary datasets and model output processed by a rerunnable pipeline; Mars wind uses MCD v6.2 climatology.</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-secondary-foreground/55">Not an official NASA product</span>
        </div>
      </footer>
    </div>
  );
}
