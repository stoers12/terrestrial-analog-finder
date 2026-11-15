import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DATA_SOURCES } from "@/data/sites";
import type { TargetsData } from "@/hooks/use-target-sites";
import { formatDate } from "@/components/target-provenance";
import { DEFAULT_WEIGHTS, DIMENSIONS, MEASURABLE_DIMENSIONS } from "@/lib/similarity";
import { ProvTag, type Prov } from "@/components/instrument";
import type { ReactNode } from "react";

function Sec({ n, title, children, testId }: { n: string; title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="grid gap-3 border-t border-foreground/10 pt-5 md:grid-cols-[120px_minmax(0,1fr)]" data-testid={testId}>
      <div>
        <div className="font-mono text-[10px] text-primary">{n}</div>
        <div className="font-display text-base font-extrabold leading-tight">{title}</div>
      </div>
      <div className="min-w-0 space-y-3">{children}</div>
    </section>
  );
}

export function AboutDialog({ pipeline }: { pipeline: TargetsData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 bg-card/70 font-mono text-[10px] uppercase tracking-wider" data-testid="button-about">
          <Info className="mr-1.5 h-4 w-4" /> Data and method
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto border-foreground/15 bg-card p-0">
        <DialogHeader className="relative overflow-hidden bg-secondary p-6 text-left text-secondary-foreground">
          <div className="pointer-events-none absolute inset-0 dossier-grid opacity-60" />
          <div className="relative font-mono text-[10px] uppercase tracking-[0.24em] opacity-60">Instrument manual / pipeline run {formatDate(pipeline.processedAt)}</div>
          <DialogTitle className="font-display relative text-3xl font-extrabold">About the data and method</DialogTitle>
          <DialogDescription className="relative text-secondary-foreground/75">How a score is made, and how far to trust it.</DialogDescription>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <ProvTag kind="measured" className="on-dark" /><ProvTag kind="raw-derived" className="on-dark" /><ProvTag kind="derived" className="on-dark" /><ProvTag kind="reference" className="on-dark" /><ProvTag kind="editorial" className="on-dark" />
          </div>
        </DialogHeader>
        <div className="space-y-5 px-6 pb-6 text-sm leading-relaxed">
          <Sec n="01" title="Scoring">
          <p>
            Each Earth site is compared to the chosen Moon or Mars site on seven dimensions. Each dimension produces a similarity between 0 and 1. The overall score is the weighted
            average of the seven, scaled to 0-100. Pressure and precipitation are compared on a log scale, so 85 versus 90 kPa is close but 0.7 versus 90 kPa is far. Geology rewards
            covering the target's settings more than it penalises extra Earth features. Wind and dust combines mean wind speed (60%) with aridity from annual rainfall (40%).
          </p>
          </Sec>
          <Sec n="02" title="Global search">
          <p>
            The global search scores every land cell of a 4° grid with the same functions but only on the five dimensions that can be measured everywhere: temperature, air and water, terrain,
            sun geometry, and wind and dust. Geology and isolation are skipped because no global layer for them is loaded, so a high-scoring cell is a lead to investigate, not a confirmed analog.
          </p>
          </Sec>
          <Sec n="03" title="Dimensions">
          <div className="grid gap-2 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="rounded-md border border-foreground/10 bg-background/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2 font-semibold"><span>{d.label}</span><span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">{MEASURABLE_DIMENSIONS.includes(d.key) && <span className="rounded-[2px] border border-foreground/20 px-1 uppercase">grid</span>}w{DEFAULT_WEIGHTS[d.key]}</span></div>
                <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-foreground/10"><div className="bg-foreground" style={{ width: `${DEFAULT_WEIGHTS[d.key] * 10}%` }} /></div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
            ))}
          </div>
          </Sec>
          <Sec n="04" title="Moon and Mars pipeline" testId="section-data-pipeline">
            <div>
            <p className="mb-2">
              Moon and Mars numbers are not typed in. A rerunnable pipeline reads public planetary data and queries the Mars Climate Database model, checks the responses and extracts values for each target. It last ran on {formatDate(pipeline.processedAt)}.
              Every value is stored with its source product, URL, processing date, pixel size and cleaning note, and carries one of three labels:
              {" "}<ProvTag kind="raw-derived" /> (computed from raw files),
              {" "}<ProvTag kind="derived" /> (model output or a stated calculation) or
              {" "}<ProvTag kind="reference" /> (a fixed value, not computed).
            </p>
            <ol className="mb-3 grid gap-px overflow-hidden rounded-md bg-foreground/10 text-xs text-muted-foreground sm:grid-cols-5">
              <li className="bg-card p-2.5"><span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">Read</span>needed map pixels by HTTP range request, MCS profiles, and the MCD model wind response.</li>
              <li className="bg-card p-2.5"><span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">Validate</span>file sizes, formats, scales, missing codes, quality flags and the MCD seasonal/local-time grid.</li>
              <li className="bg-card p-2.5"><span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">Clean</span>mask missing codes, reject physically impossible temperatures, apply quality flags.</li>
              <li className="bg-card p-2.5"><span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">Process</span>pool valid pixels or nearby profiles, and average MCD wind across its seasonal and local-time grid.</li>
              <li className="bg-card p-2.5"><span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">Check</span>compare against published figures, and stop if any check fails.</li>
            </ol>
            <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
              {pipeline.datasets.map((d) => (
                <li key={d.name} className="px-3 py-2" data-testid={`dataset-${d.name}`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <a href={d.url} target="_blank" rel="noreferrer" className="font-medium underline decoration-foreground/30">{d.name}</a>
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{d.body} <ProvTag kind={d.kind as Prov} /></span>
                  </div>
                  <div className="text-xs text-muted-foreground">{d.role}</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-muted-foreground">
                    {d.steps.map((st, i) => <li key={i}>{st}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest">Checks against published figures ({pipeline.validation.length})</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {pipeline.validation.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </details>
            <p className="mt-2 text-xs text-muted-foreground">
              Mars wind is a 10 m global model climatology from MCD v6.2, not a rover measurement or forecast. The Moon has no atmosphere, so pressure and wind are 0.
              The Mars Climate Sounder only observes near 3 am and 3 pm local time, so its mean is the average of those two times, not a full-day average.
            </p>
            </div>
          </Sec>
          <Sec n="05" title="Data sources">
            <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
              {DATA_SOURCES.map((s) => (
                <li key={s.name} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <span className="font-medium">{s.name}</span>
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.body} <ProvTag kind={s.kind} /></span>
                  <span className="text-xs text-muted-foreground sm:col-span-2">{s.use}</span>
                </li>
              ))}
            </ul>
          </Sec>
          <p className="rounded-md border-l-2 border-primary bg-primary/10 px-3 py-2">
            Honesty note: for Earth, temperature is the 2001-2025 NASA POWER skin (surface) temperature climatology (MERRA-2, about 50 km resolution, so mountain sites are smoothed); precipitation, pressure and wind come from the same
            dataset, and relief is measured from a global terrain model within about 15 km. Earth "coldest" is the mean daily minimum of the coldest month. For the Moon and Mars, "coldest" is the mean of the coldest 10% of night
            samples and "warmest" the mean of the warmest 10% of day samples, so the two definitions are close but not identical. Moon and Mars temperatures come from one year of Diviner maps and one Mars year of sampled MCS
            profiles, not a full multi-year climatology. Mars wind is a 10 m MCD v6.2 model climatology, not a rover measurement or forecast; Mars pressure is also a model. Geology tags, isolation scores and analog status are editorial judgments. No Earth site can reproduce
            lunar or Martian air pressure, gravity or radiation; the scores measure how good a rehearsal is, not an equivalence.
          </p>
          <p className="text-xs text-muted-foreground">Built for the NASA Space Apps Challenge 2026. Earth data from NASA POWER, a global DEM and NASA GIBS imagery; Moon and Mars data from LRO, MGS and MRO products processed by the pipeline.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
