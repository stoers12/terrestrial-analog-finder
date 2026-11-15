import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CircleHelp, Compass, Database, Info, MapPinned, Mountain, Sun, Thermometer } from "lucide-react";
import "./_group.css";
import { TargetSelector } from "./_source/components/target-selector";
import { TargetProvenance, TemperatureDefinitions } from "./_source/components/target-provenance";
import { DATA_SOURCES, EARTH_SEEDS, TARGET_SEEDS, TARGET_REFERENCE, hydrateTargetSite, type TargetApiSite } from "./_source/data/sites";
import targets from "./_source/targets.json";

const targetSites = TARGET_SEEDS.map((seed) =>
  hydrateTargetSite(seed, targets.sites.find((site) => site.id === seed.id) as TargetApiSite),
);

const sampleRanking = [
  { id: "earth-drivalleys", score: 51.3 },
  { id: "earth-haughton", score: 45.8 },
  { id: "earth-meteor", score: 37.9 },
  { id: "earth-tibesti", score: 37.9 },
].flatMap((entry, index) => {
  const site = EARTH_SEEDS.find((candidate) => candidate.id === entry.id);
  return site ? [{ ...entry, rank: index + 1, site }] : [];
});
const sampleTarget = targetSites.find((site) => site.id === "moon-shackleton")!;
const sampleSite = EARTH_SEEDS.find((site) => site.id === "earth-drivalleys")!;

function coordinateX(lon: number) {
  return ((lon + 180) / 360) * 720;
}

function coordinateY(lat: number) {
  return ((90 - lat) / 180) * 300;
}

function CoordinatePlot() {
  return (
    <div className="relative overflow-hidden rounded-md border border-[hsl(var(--foreground)/.12)] bg-[#e4ebe6]">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-sm border border-[hsl(var(--foreground)/.12)] bg-[#f3f4ec]/90 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--foreground)/.7)] backdrop-blur-sm">
        <MapPinned className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
        Earth field-site coordinates
      </div>
      <svg viewBox="0 0 720 300" role="img" aria-label="Equirectangular latitude and longitude plot of catalogued Earth analog field sites, with McMurdo Dry Valleys highlighted." className="block h-[260px] w-full sm:h-[320px]">
        <defs>
          <pattern id="plot-grid" width="120" height="75" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 60" fill="none" stroke="#59736c" strokeOpacity=".17" strokeWidth="1" />
          </pattern>
          <radialGradient id="plot-wash">
            <stop offset="0" stopColor="#c3d6ca" stopOpacity=".65" />
            <stop offset="1" stopColor="#e4ebe6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="720" height="300" fill="url(#plot-wash)" />
        <rect width="720" height="300" fill="url(#plot-grid)" />
        {[0, 1, 2, 3, 4].map((line) => (
          <text key={`lat-${line}`} x="8" y={line * 75 + 13} fill="#4f6962" fontSize="9" fontFamily="var(--app-font-mono)">
            {90 - line * 45}°
          </text>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((line) => (
          <text key={`lon-${line}`} x={line * 120 + 6} y="291" fill="#4f6962" fontSize="9" fontFamily="var(--app-font-mono)">
            {line * 60 - 180}°
          </text>
        ))}
        <line x1="0" y1="150" x2="720" y2="150" stroke="#536d65" strokeOpacity=".38" strokeDasharray="4 5" />
        {EARTH_SEEDS.map((site) => {
          const featured = site.id === sampleSite.id;
          const inSampleRanking = sampleRanking.some((row) => row.id === site.id);
          return (
            <g key={site.id}>
              {featured && <circle cx={coordinateX(site.lon)} cy={coordinateY(site.lat)} r="14" fill="#d0643e" fillOpacity=".15" />}
              <circle
                cx={coordinateX(site.lon)}
                cy={coordinateY(site.lat)}
                r={featured ? 6 : inSampleRanking ? 4 : 3}
                fill={featured ? "#b94f2d" : inSampleRanking ? "#375d56" : "#6c8780"}
                stroke="#f3f4ec"
                strokeWidth={featured ? 2 : 1}
                opacity={featured || inSampleRanking ? 1 : 0.7}
              />
              {featured && (
                <g>
                  <path d={`M${coordinateX(site.lon) - 5} ${coordinateY(site.lat) - 10} L${coordinateX(site.lon) - 27} ${coordinateY(site.lat) - 29}`} stroke="#99482f" strokeWidth="1" />
                  <rect x={coordinateX(site.lon) - 126} y={coordinateY(site.lat) - 48} width="98" height="24" rx="3" fill="#f3f4ec" stroke="#b94f2d" strokeWidth=".8" />
                  <text x={coordinateX(site.lon) - 117} y={coordinateY(site.lat) - 32} fill="#263d38" fontSize="9" fontWeight="600" fontFamily="var(--app-font-sans)">
                    McMurdo Dry Valleys
                  </text>
                </g>
              )}
              <title>{site.name} · {site.lat}°, {site.lon}°</title>
              <circle cx={coordinateX(site.lon)} cy={coordinateY(site.lat)} r={featured ? 12 : 8} fill="transparent" />
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--foreground)/.1)] bg-[#eef1e9] px-4 py-2.5 text-[10px] text-[hsl(var(--foreground)/.64)]">
        <span>Linear latitude / longitude projection · no basemap or terrain inference</span>
        <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider"><span className="h-2 w-2 rounded-full bg-[#b94f2d]" /> Sample result</span>
      </div>
    </div>
  );
}

export function Proposal() {
  const [targetId, setTargetId] = useState(sampleTarget.id);
  const target = useMemo(() => targetSites.find((site) => site.id === targetId) ?? sampleTarget, [targetId]);

  return (
    <div data-body={target.body} className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--foreground)/.12)] bg-[hsl(var(--background)/.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <a href="#top" className="group flex items-center gap-3" aria-label="Terrestrial Analog Finder, return to top">
            <span className="relative grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--foreground)/.2)] bg-[hsl(var(--secondary))]">
              <span className="absolute h-5 w-5 rounded-full border border-[hsl(var(--secondary-foreground)/.45)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))] transition-transform duration-300 group-hover:scale-125" />
            </span>
            <span>
              <span className="block font-[var(--app-font-display)] text-[15px] font-extrabold leading-tight sm:text-base">Terrestrial Analog Finder</span>
              <span className="hidden font-mono text-[9px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))] sm:block">Moon & Mars field rehearsal planner</span>
            </span>
          </a>
          <nav className="flex items-center gap-2 sm:gap-5">
            <a href="#how-scores-work" className="hidden text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] sm:inline">How scores work</a>
            <a href="#sources" className="inline-flex items-center gap-1.5 rounded-sm border border-[hsl(var(--foreground)/.18)] px-3 py-2 text-xs font-semibold transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--secondary-foreground))]">
              <Database className="h-3.5 w-3.5" /> Data & method
            </a>
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
        <section className="grid gap-8 pb-7 pt-9 md:grid-cols-[minmax(0,1fr)_minmax(260px,.52fr)] md:items-end md:gap-12 md:pb-9 md:pt-14">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.23em] text-[hsl(var(--muted-foreground))]">
              <Compass className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Field planning, one comparison at a time
            </div>
            <h1 className="max-w-[820px] font-[var(--app-font-display)] text-[clamp(2.45rem,6.3vw,5.8rem)] font-extrabold leading-[.96] tracking-[-.055em]">
              Earth is a rehearsal.<br />
              <span className="text-[hsl(var(--primary))]">Choose the ground.</span>
            </h1>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }} className="max-w-[450px] border-l-2 border-[hsl(var(--primary))] pl-4 md:mb-1">
            <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-[15px]">
              Pick a Moon or Mars mission site. See which Earth field locations share its conditions—and, just as importantly, where the analogy stops.
            </p>
            <a href="#start" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]">
              Choose a target <ArrowDown className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </section>

        <section id="start" className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">01 / Set the destination</div>
              <h2 className="mt-1 font-[var(--app-font-display)] text-xl font-extrabold sm:text-2xl">Which world are you preparing for?</h2>
            </div>
            <span className="hidden font-mono text-[10px] text-[hsl(var(--muted-foreground))] sm:inline">Select a named mission site</span>
          </div>
          <TargetSelector target={target} targetSites={targetSites} onChange={setTargetId} />
          <div className="mt-3 flex items-start gap-2 rounded-sm border border-[hsl(var(--primary)/.28)] bg-[hsl(var(--primary)/.07)] px-3 py-2.5 text-xs leading-relaxed text-[hsl(var(--foreground)/.78)]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]" />
            <p><strong className="text-[hsl(var(--foreground))]">Static design preview.</strong> Target choice is editable, but the example ranking below stays pinned to Shackleton; choosing another target does not calculate or imply new results.</p>
          </div>
        </section>

        <section id="results" className="scroll-mt-24 pt-10 sm:pt-14">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">02 / Read the field</div>
              <h2 className="mt-1 font-[var(--app-font-display)] text-2xl font-extrabold sm:text-3xl">A match is a starting point, not a verdict.</h2>
            </div>
            <span className="rounded-full border border-[hsl(var(--foreground)/.18)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Illustrative static preview data</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
            <div className="space-y-4">
              <CoordinatePlot />

              <article className="overflow-hidden rounded-md border border-[hsl(var(--foreground)/.16)] bg-[hsl(var(--card))]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[hsl(var(--foreground)/.1)] px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Catalog result · rank 01 · Shackleton Crater rim</div>
                    <h3 className="mt-1 font-[var(--app-font-display)] text-2xl font-extrabold sm:text-[1.8rem]">{sampleSite.name}</h3>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Antarctica · established analog field site</p>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <div className="font-mono text-[2.55rem] font-bold leading-none tracking-[-.06em] text-[#9b4a31]">51.3</div>
                    <div className="border-l border-[hsl(var(--foreground)/.16)] pl-3">
                      <div className="font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Overall</div>
                      <div className="text-xs font-bold text-[#8a442f]">Weak analog</div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_1.25fr] sm:px-5">
                  <div>
                    <div className="mb-2 font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Where it helps · where it falls short</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-sm bg-[#e6eee7] px-2.5 py-2 text-xs font-semibold text-[#315b4f]">
                        <Sun className="h-3.5 w-3.5 shrink-0" /> Sun geometry · strong
                      </div>
                      <div className="flex items-center gap-2 rounded-sm bg-[#e6eee7] px-2.5 py-2 text-xs font-semibold text-[#315b4f]">
                        <Mountain className="h-3.5 w-3.5 shrink-0" /> Isolation · strong
                      </div>
                      <div className="flex items-center gap-2 rounded-sm bg-[#f2e6df] px-2.5 py-2 text-xs font-semibold text-[#873f2c]">
                        <Thermometer className="h-3.5 w-3.5 shrink-0" /> Temperature · weak
                      </div>
                    </div>
                  </div>
                  <div className="rounded-sm border-l-2 border-[hsl(var(--primary))] bg-[hsl(var(--muted)/.62)] px-3 py-3">
                    <div className="font-mono text-[9px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">What that means for a team</div>
                    <p className="mt-1.5 text-sm leading-relaxed">
                      A remote, high-latitude setting is useful for practicing isolation and low-sun operations. Its temperatures do not reproduce the lunar cold; it is not a thermal-hardware stand-in.
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      The 51.3 score summarizes seven catalog dimensions. It should not be read as a probability of mission success.
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <aside className="rounded-md border border-[hsl(var(--foreground)/.16)] bg-[hsl(var(--card))] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Catalog ranking</div>
                  <h3 className="mt-1 font-[var(--app-font-display)] text-xl font-extrabold">Earth field sites</h3>
                </div>
                <span className="rounded-sm bg-[hsl(var(--secondary))] px-2 py-1 font-mono text-[9px] text-[hsl(var(--secondary-foreground))]">21 sites</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">The best-scoring catalog locations are ranked against the Shackleton example.</p>
              <ol className="mt-4 divide-y divide-[hsl(var(--foreground)/.1)]">
                {sampleRanking.map(({ id, rank, score, site }) => {
                  const lead = rank === 1;
                  return (
                    <li key={id} className={`relative flex items-center gap-3 py-3 ${lead ? "mx-[-.5rem] rounded-sm bg-[#e8eee8] px-2" : "px-1"}`}>
                      <span className="w-6 font-mono text-xs text-[hsl(var(--muted-foreground))]">{String(rank).padStart(2, "0")}</span>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[10px] ${lead ? "bg-[#b94f2d] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground)/.7)]"}`}>{rank}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{site.name}</div>
                        <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">{site.region}</div>
                      </div>
                      <div className="font-mono text-base font-bold tabular-nums">{score.toFixed(1)}</div>
                    </li>
                  );
                })}
              </ol>
              <div id="how-scores-work" className="mt-3 scroll-mt-24 border-t border-[hsl(var(--foreground)/.12)] pt-3">
                <div className="flex items-start gap-2">
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    <strong className="text-[hsl(var(--foreground))]">Two different searches.</strong> Catalog ranking scores 21 named field sites on 7 dimensions, including geology and editorial isolation. Global discoveries scan Earth on 5 measurable dimensions. Their scores are not directly comparable.
                  </p>
                </div>
                <a href="#discoveries" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]">
                  About global discoveries <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </aside>
          </div>
        </section>

        <section id="discoveries" className="mt-9 grid gap-4 border-y border-[hsl(var(--foreground)/.14)] py-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"><Compass className="h-4 w-4" /></span>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Beyond the catalogue</div>
              <h3 className="mt-1 font-[var(--app-font-display)] text-lg font-extrabold">A global scan can surface places not yet in the field-site list.</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">It evaluates five measurable dimensions across a global grid. The scan is a discovery aid, not an extension of the seven-dimension catalog ranking; compare patterns and evidence, not score values.</p>
            </div>
          </div>
          <span className="justify-self-start rounded-sm border border-dashed border-[hsl(var(--foreground)/.25)] px-3 py-2 font-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] sm:justify-self-end">Method note</span>
        </section>

        <section id="sources" className="scroll-mt-24 pt-8">
          <div className="grid gap-6 md:grid-cols-[.8fr_1.2fr]">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">Evidence before analogy</div>
              <h2 className="mt-1 font-[var(--app-font-display)] text-2xl font-extrabold">Know what each number can—and can’t—say.</h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Off-Earth measurements are processed from mission datasets; Earth values use named climate and elevation sources. Editorial geology and isolation estimates are identified separately.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["NASA POWER / MERRA-2", "LRO Diviner + LOLA", "MRO MCS · MGS MOLA", "SRTM-based DEM"].map((name) => (
                  <span key={name} className="rounded-sm border border-[hsl(var(--foreground)/.17)] px-2 py-1.5 font-mono text-[9px] text-[hsl(var(--foreground)/.72)]">{name}</span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <details className="group rounded-sm border border-[hsl(var(--foreground)/.15)] bg-[hsl(var(--card)/.72)] px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-sm">
                  <span>What the numbers represent</span>
                  <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))] group-open:hidden">Expand</span>
                  <span className="hidden font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))] group-open:inline">Close</span>
                </summary>
                <div className="mt-3 space-y-3 border-t border-[hsl(var(--foreground)/.1)] pt-3">
                  <TemperatureDefinitions body={target.body as "moon" | "mars"} />
                  <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">{TARGET_REFERENCE[target.body as "moon" | "mars"].values} Geological labels and isolation are editorially curated, not raster measurements.</p>
                  <TargetProvenance target={target} />
                </div>
              </details>
              <details className="group rounded-sm border border-[hsl(var(--foreground)/.15)] bg-[hsl(var(--card)/.72)] px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-sm">
                  <span>Sources used in the comparison</span>
                  <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))] group-open:hidden">Expand</span>
                  <span className="hidden font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))] group-open:inline">Close</span>
                </summary>
                <ul className="mt-3 space-y-2 border-t border-[hsl(var(--foreground)/.1)] pt-3">
                  {DATA_SOURCES.map((source) => (
                    <li key={source.name} className="grid gap-1 text-[11px] sm:grid-cols-[150px_1fr]">
                      <span className="font-semibold">{source.name}</span>
                      <span className="leading-relaxed text-[hsl(var(--muted-foreground))]">{source.body} · {source.use}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-[hsl(var(--foreground)/.14)] pt-4 text-[10px] text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
          <span>Terrestrial Analog Finder <span className="mx-1.5 text-[hsl(var(--foreground)/.35)]">/</span> A field-planning aid, not a substitute for mission requirements.</span>
          <a href="#top" className="inline-flex items-center gap-1 font-mono uppercase tracking-[.14em] hover:text-[hsl(var(--foreground))]">Back to top <ArrowUpRight className="h-3 w-3" /></a>
        </footer>
      </main>
    </div>
  );
}

export default Proposal;
