import { useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowDownRight, Compass, Database, Globe2, Loader2, Radar, ShieldAlert, TriangleAlert } from "lucide-react";
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
  return <HomeLoaded earthSites={sites} targets={targets.data} />;
}

function HomeLoaded({ earthSites, targets }: { earthSites: Site[]; targets: TargetsData }) {
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
  const enterExplorer = () => {
    document.getElementById("explorer")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div data-body={target.body} className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a href="#top" className="group flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-home">
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Compass className="h-4 w-4 text-primary" />
              <motion.span className="absolute inset-[3px] rounded-full border border-body-accent/60 border-t-transparent" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }} />
            </div>
            <div>
              <div className="font-display text-base font-extrabold leading-none sm:text-lg">Terrestrial Analog Finder</div>
              <div className="hidden font-mono text-[9px] uppercase tracking-[0.19em] text-muted-foreground sm:block">Planetary field rehearsal</div>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-foreground/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:inline-flex">Independent · Space Apps 2026</span>
            <AboutDialog pipeline={targets} />
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden border-b border-foreground/10 bg-secondary text-secondary-foreground">
          <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_40%,hsl(var(--body-accent)/.35),transparent_44%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--secondary))_0%,transparent_75%)]" />
          </div>
          <div className="relative mx-auto grid min-h-[570px] max-w-[1500px] grid-cols-1 items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-5 md:py-20 lg:gap-10 lg:px-12">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative z-10 md:col-start-1 md:row-start-1"
            >
              <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-secondary-foreground/65">
                <span className="h-px w-8 bg-primary" /> A field-rehearsal instrument for other worlds
              </div>
              <h1 className="font-display max-w-[780px] text-[clamp(3.1rem,7.5vw,7.4rem)] font-extrabold leading-[.88] tracking-[-.065em]">
                Earth is our <span className="text-body-accent">test range.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-secondary-foreground/78 md:text-lg">
                Find where a Moon or Mars mission can rehearse on Earth—and see, dimension by dimension, where the analogy holds and where it fails.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={enterExplorer} size="lg" className="group rounded-sm px-5 font-semibold" data-testid="button-enter-explorer">
                  Open the live explorer
                  <ArrowDownRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                </Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-secondary-foreground/55">Live comparisons · transparent limits</span>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-secondary-foreground/15 pt-5 text-xs text-secondary-foreground/65">
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--moon))]" /> Lunar landing and base sites</span>
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--mars))]" /> Martian landing and base sites</span>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="relative mx-auto flex aspect-square w-full max-w-[490px] items-center justify-center md:col-start-2 md:row-start-1 md:justify-self-end max-md:aspect-auto max-md:grid max-md:grid-cols-2 max-md:gap-3 max-md:py-2"
              aria-label="Illustration of Earth as a planetary field site"
              data-testid="visual-planetary-fieldwork"
            >
              <div className="absolute inset-[8%] rounded-full border border-secondary-foreground/15" />
              <div className="absolute inset-[18%] rounded-full border border-dashed border-secondary-foreground/20" />
              <div className="absolute inset-[28%] rounded-full border border-secondary-foreground/10" />
              <motion.div
                className="absolute inset-[8%] rounded-full border border-transparent border-t-primary/90"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 36, ease: "linear" }}
              />
              <div className="relative z-[1] col-span-2 row-start-1 grid aspect-square w-[57%] place-items-center overflow-hidden rounded-full border border-secondary-foreground/20 bg-[radial-gradient(circle_at_34%_30%,hsl(168_34%_62%),hsl(183_30%_28%)_48%,hsl(222_43%_11%)_76%)] shadow-[inset_-28px_-16px_55px_hsl(222_47%_6%/.75),0_0_90px_hsl(var(--body-accent)/.14)] max-md:w-[70%]">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(166deg, transparent 0 18px, hsl(168 28% 80% / .15) 19px, transparent 20px 39px), repeating-linear-gradient(28deg, transparent 0 35px, hsl(16 75% 70% / .12) 36px, transparent 37px 70px)" }} />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(105deg,transparent_34%,hsl(222_47%_8%/.8)_100%)]" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <Radar className="h-8 w-8 text-primary" strokeWidth={1.2} />
                  <span className="mt-3 font-mono text-[9px] uppercase tracking-[.25em] text-secondary-foreground/70">Compare worlds</span>
                </div>
              </div>
              <div className="absolute right-[2%] top-[18%] rounded-sm border border-secondary-foreground/15 bg-secondary/85 px-3 py-2 backdrop-blur max-md:static max-md:col-start-1 max-md:row-start-2 max-md:w-full max-md:px-2 max-md:py-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-secondary-foreground/55">Earth measurements</div>
                <div className="mt-1 flex items-center gap-2 text-xs"><Database className="h-3.5 w-3.5 text-primary" /> Climate + terrain</div>
              </div>
              <div className="absolute bottom-[13%] left-[0%] rounded-sm border border-secondary-foreground/15 bg-secondary/85 px-3 py-2 backdrop-blur max-md:static max-md:col-start-2 max-md:row-start-2 max-md:w-full max-md:px-2 max-md:py-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-secondary-foreground/55">Mission site</div>
                <div className="mt-1 flex items-center gap-2 text-xs"><Globe2 className="h-3.5 w-3.5 text-body-accent" /> {target.body === "moon" ? "Moon" : "Mars"} · {target.region}</div>
              </div>
              <div className="absolute left-[12%] top-[19%] h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_hsl(var(--primary)/.15)]" />
              <div className="absolute bottom-[26%] right-[17%] h-1.5 w-1.5 rounded-full bg-secondary-foreground/80" />
            </motion.div>
          </div>
          <div className="relative mx-auto max-w-[1500px] px-5 pb-7 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary-foreground/15 pt-4 font-mono text-[9px] uppercase tracking-[.17em] text-secondary-foreground/50">
              <span>Independent project · NASA Space Apps Challenge 2026</span>
              <span>Not an official NASA product</span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1500px] gap-0 px-5 py-12 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:py-16 lg:px-12" aria-label="How the research tool works">
          <div className="pb-7 md:pb-0 md:pr-10">
            <div className="font-mono text-[10px] uppercase tracking-[.25em] text-primary">From observations to fieldwork</div>
            <h2 className="font-display mt-3 max-w-md text-3xl font-bold leading-tight md:text-4xl">A comparison you can interrogate.</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Not a claim that Earth can reproduce another world. A way to choose what to practise, with the evidence and the gaps visible.</p>
          </div>
          <div className="grid divide-y divide-foreground/10 border-y border-foreground/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            <MethodStep number="01" icon={<Database className="h-4 w-4" />} title="Bring the evidence" body="Measured Earth climate and terrain meet Moon and Mars values processed from planetary data." />
            <MethodStep number="02" icon={<Activity className="h-4 w-4" />} title="Tune the comparison" body="Seven weighted dimensions shape live rankings; adjust mission priorities and inspect the component scores." />
            <MethodStep number="03" icon={<ShieldAlert className="h-4 w-4" />} title="Keep the limits in view" body="Explore uncatalogued grid leads, then review what a site can rehearse—and what it cannot." />
          </div>
        </section>

        <section id="explorer" className="scroll-mt-20 border-t border-foreground/10 bg-background/55">
          <div className="mx-auto max-w-[1500px] px-4 py-10 md:px-6 md:py-14">
            <div className="mb-7 flex flex-col justify-between gap-5 border-b border-foreground/10 pb-6 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.25em] text-primary"><span className="h-px w-6 bg-primary" /> Research workspace</div>
                <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight md:text-5xl">Choose a world. Find a field site.</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Select a target to recompute the Earth ranking, map, and global-grid leads. Every score is a rehearsal-comparison aid—not evidence of equivalence or mission safety.</p>
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
                />
                <section className="rounded-md border border-foreground/15 bg-card/70 p-3">
                  <div className="mb-3 flex items-baseline justify-between px-1">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Weighted similarity</div>
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
                      <label htmlFor="min-score">Minimum score</label><span className="font-mono">{minScore}</span>
                    </div>
                    <Slider id="min-score" value={[minScore]} min={0} max={90} step={1} onValueChange={(v) => setMinScore(v[0])} data-testid="slider-min-score" />
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

function MethodStep({ number, icon, title, body }: { number: string; icon: ReactNode; title: string; body: string }) {
  return (
    <article className="flex gap-3 py-5 md:flex-col md:gap-5 md:px-5 md:py-6 first:md:pl-0 last:md:pr-0" data-testid={`method-step-${number}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-primary">{icon}</div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">{number} / Field method</div>
        <h3 className="font-display mt-1 text-lg font-bold">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </article>
  );
}
