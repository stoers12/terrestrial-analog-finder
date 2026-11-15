import { useMemo, useState } from "react";
import "./_group.css";
import { TargetSelector } from "./_source/components/target-selector";
import { RankedList } from "./_source/components/ranked-list";
import { EARTH_SEEDS, TARGET_SEEDS, hydrateTargetSite, type Site, type TargetApiSite } from "./_source/data/sites";
import type { Match } from "./_source/lib/similarity";
import targets from "./_source/targets.json";

const targetSites = TARGET_SEEDS.map((seed) =>
  hydrateTargetSite(seed, targets.sites.find((site) => site.id === seed.id) as TargetApiSite),
);

// Example ranking shown in the current application for Shackleton.
const example = [
  ["drivalleys", 51.3],
  ["haughton", 45.8],
  ["meteor", 37.9],
  ["tibesti", 37.9],
] as const;
const items = example.flatMap(([needle, score], i) => {
  const seed = EARTH_SEEDS.find((site) => site.id.includes(needle));
  if (!seed) return [];
  return [{ rank: i + 1, match: { site: seed as Site, score } as Match }];
});

export function Current() {
  const [targetId, setTargetId] = useState(targetSites[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.match.site.id ?? null);
  const target = useMemo(() => targetSites.find((site) => site.id === targetId) ?? targetSites[0], [targetId]);

  return (
    <div data-body={target.body} className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary"><div className="h-3 w-3 rounded-full bg-primary" /></div>
            <div><div className="font-display text-lg font-extrabold leading-none">Terrestrial Analog Finder</div><div className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">Moon and Mars rehearsal planner</div></div>
          </div>
          <div className="rounded border border-foreground/10 bg-card px-3 py-2 text-xs">Data and method</div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-6">
        <div>
          <h1 className="font-display max-w-4xl text-3xl font-extrabold leading-[1.05] md:text-5xl">We cannot go yet. <span className="text-body-accent">Where on Earth</span> should we rehearse?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">Pick a Moon or Mars base site. 21 Earth field sites are ranked live on 7 dimensions using measured NASA POWER climate and terrain data, against Moon and Mars values processed from raw NASA files, and a global grid search looks for places nobody has catalogued.</p>
        </div>
        <TargetSelector target={target} targetSites={targetSites} onChange={setTargetId} />
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-md border border-foreground/15 bg-card/60 p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Current result · example</div>
            <h2 className="font-display mt-2 text-2xl font-extrabold">McMurdo Dry Valleys</h2>
            <p className="mt-2 text-sm text-muted-foreground">The current layout places the map and detailed comparison before the full explanation of the result.</p>
            <p className="mt-4 text-sm">Example ranking below reflects Shackleton. This isolated design preview does not calculate live results.</p>
          </div>
          <section className="rounded-md border border-foreground/15 bg-card/60 p-3">
            <div className="mb-3 flex justify-between px-1"><h3 className="font-display text-lg font-bold">Ranking</h3><span className="font-mono text-[11px] text-muted-foreground">21 / 21 sites</span></div>
            <RankedList items={items} selectedId={selectedId} onSelect={setSelectedId} onClearFilters={() => {}} targetKey={target.id} />
          </section>
        </section>
      </main>
    </div>
  );
}
