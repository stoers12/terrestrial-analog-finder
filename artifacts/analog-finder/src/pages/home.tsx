import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TARGET_SITES, type AnalogStatus } from "@/data/sites";
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
  const [targetId, setTargetId] = useState(TARGET_SITES[0].id);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [minScore, setMinScore] = useState(0);

  const target = TARGET_SITES.find((t) => t.id === targetId) ?? TARGET_SITES[0];
  const ranked = useMemo(() => rankAnalogs(target, weights), [target, weights]);
  const withRank = useMemo(() => ranked.map((match, i) => ({ match, rank: i + 1 })), [ranked]);
  const visible = useMemo(
    () => withRank.filter(({ match }) => (filter === "all" || match.site.status === filter) && match.score >= minScore),
    [withRank, filter, minScore],
  );

  const effectiveId = selectedId ?? visible[0]?.match.site.id ?? ranked[0]?.site.id ?? null;
  const selected = withRank.find((r) => r.match.site.id === effectiveId) ?? null;

  const changeTarget = (id: string) => {
    setTargetId(id);
    setSelectedId(null);
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
          <AboutDialog />
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display max-w-4xl text-3xl font-extrabold leading-[1.05] md:text-5xl">
            We cannot go yet. <span className="text-body-accent">Where on Earth</span> should we rehearse?
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Pick a Moon or Mars base site. {ranked.length} Earth field sites are ranked live on six dimensions, including candidates no analog programme uses yet.
          </p>
        </motion.div>

        <TargetSelector target={target} onChange={changeTarget} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <AnalogMap matches={visible} selectedId={effectiveId} onSelect={setSelectedId} />
            <SiteDetail target={target} match={selected?.match ?? null} rank={selected?.rank ?? 0} />
          </div>

          <aside className="space-y-4">
            <BestNew ranked={ranked} onSelect={(id) => setSelectedId(id)} />
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
                  onSelect={setSelectedId}
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
          weights={weights}
          targetId={target.id}
          selectedId={effectiveId}
          onPick={(t, s) => {
            setTargetId(t);
            setSelectedId(s);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </main>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-[1500px] flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:px-6">
          <span>Built for the NASA Space Apps Challenge 2026. Uses open NASA and partner-agency data.</span>
          <span className="font-mono">Indicative values · not survey-grade</span>
        </div>
      </footer>
    </div>
  );
}
