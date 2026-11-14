import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, TriangleAlert } from "lucide-react";
import type { AnalogStatus, Site } from "@/data/sites";
import { useTargetSites, type TargetsData } from "@/hooks/use-target-sites";
import { useEarthSites, useGrid } from "@/hooks/use-earth-sites";
import { cellKey, findDiscoveries, scoreGrid } from "@/lib/discoveries";
import { Discoveries } from "@/components/discoveries";
import { DiscoveryDetail } from "@/components/discovery-detail";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEIGHTS, DIMENSIONS, rankAnalogs, type DimensionKey, type Weights } from "@/lib/similarity";
import { TargetSelector } from "@/components/target-selector";
import { AnalogMap } from "@/components/analog-map";
import { RankedList } from "@/components/ranked-list";
import { WeightsPanel } from "@/components/weights-panel";
import { SiteDetail } from "@/components/site-detail";
import { BestNew } from "@/components/best-new";
import { CoverageMatrix } from "@/components/coverage-matrix";
import { AboutDialog } from "@/components/about-dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Filter = "all" | AnalogStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "proposed", label: "Proposed new" },
  { id: "emerging", label: "Emerging" },
  { id: "established", label: "Established" },
];

export default function Home() {
  const earth = useEarthSites();
  const targets = useTargetSites();
  const sites = earth.sites;
  const isLoading = earth.isLoading || targets.isLoading;
  const error = earth.error ?? targets.error;
  const refetch = () => {
    if (earth.error) earth.refetch();
    if (targets.error) targets.refetch();
  };
  if (!sites || !targets.data) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-secondary p-6 text-secondary-foreground" data-testid="status-loading-sites">
        <div className="max-w-sm text-center">
          {error ? (
            <>
              <TriangleAlert className="mx-auto h-7 w-7 text-primary" />
              <div className="font-display mt-3 text-xl font-bold">Could not load measured data</div>
              <p className="mt-1 text-sm opacity-80">{error.message}</p>
              <Button className="mt-4" onClick={refetch} data-testid="button-retry">Try again</Button>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
              <div className="font-mono mt-3 text-[11px] uppercase tracking-[0.3em] opacity-70">
                {isLoading ? "Measuring Earth sites and loading Moon and Mars data" : "Loading"}
              </div>
              <p className="mt-2 text-sm opacity-80">Pulling climate from NASA POWER, elevation from a global terrain model, and the processed Moon and Mars values from the data pipeline. The first visit can take a few seconds.</p>
            </>
          )}
        </div>
      </div>
    );
  }
  return <HomeLoaded earthSites={sites} targets={targets.data} />;
}

function HomeLoaded({ earthSites, targets }: { earthSites: Site[]; targets: TargetsData }) {
  const targetSites = targets.sites;
  const [targetId, setTargetId] = useState(targetSites[0].id);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [minScore, setMinScore] = useState(0);

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
  const discoveries = useMemo(() => (scored ? findDiscoveries(scored, earthSites) : []), [scored, earthSites]);
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
    <div data-body={target.body} className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <motion.div className="absolute h-5 w-5 rounded-full border-2 border-body-accent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} style={{ borderTopColor: "transparent" }} />
            </div>
            <div>
              <div className="font-display text-lg font-extrabold leading-none">Terrestrial Analog Finder</div>
              <div className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">Moon and Mars rehearsal planner</div>
            </div>
          </div>
          <AboutDialog pipeline={targets} />
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display max-w-4xl text-3xl font-extrabold leading-[1.05] md:text-5xl">
            We cannot go yet. <span className="text-body-accent">Where on Earth</span> should we rehearse?
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Pick a Moon or Mars base site. {ranked.length} Earth field sites are ranked live on {DIMENSIONS.length} dimensions using measured NASA POWER climate and terrain data, against Moon and Mars values processed from raw NASA files, and a global grid search looks for places nobody has catalogued.
          </p>
        </motion.div>

        <TargetSelector target={target} targetSites={targetSites} onChange={changeTarget} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
            />
            <section className="rounded-md border border-foreground/15 bg-card/60 p-3">
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h3 className="font-display text-lg font-bold">Ranking</h3>
                <span className="font-mono text-[11px] text-muted-foreground" data-testid="text-visible-count">{visible.length} / {ranked.length} sites</span>
              </div>
              <div className="mb-3 grid grid-cols-4 gap-1 rounded-[5px] bg-muted p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    data-testid={`button-filter-${f.id}`}
                    className={cn("relative rounded-[3px] px-1 py-1.5 text-[11px] font-medium transition-colors", filter === f.id ? "text-secondary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    {filter === f.id && <motion.span layoutId="filter-pill" className={cn("absolute inset-0 rounded-[3px]", f.id === "proposed" ? "bg-primary" : "bg-secondary")} />}
                    <span className="relative">{f.label}</span>
                  </button>
                ))}
              </div>
              <div className="mb-3 px-1">
                <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>Minimum score</span><span className="font-mono">{minScore}</span>
                </div>
                <Slider value={[minScore]} min={0} max={90} step={1} onValueChange={(v) => setMinScore(v[0])} data-testid="slider-min-score" />
              </div>
              <div className="max-h-[560px] overflow-y-auto pr-1">
                <RankedList
                  items={visible}
                  selectedId={effectiveId}
                  onSelect={pickSite}
                  targetKey={target.id}
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
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </main>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-[1500px] flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:px-6">
          <span>
            Built for the NASA Space Apps Challenge 2026. Earth climate from NASA POWER, terrain from a global DEM, imagery from NASA GIBS. Moon and Mars values are processed from raw LRO, MGS and MRO files by a rerunnable pipeline; Mars wind is a reference value.
          </span>
          <span className="font-mono">Measured Earth data · pipeline-processed Moon/Mars data</span>
        </div>
      </footer>
    </div>
  );
}
