import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DATA_SOURCES } from "@/data/sites";
import type { TargetsData } from "@/hooks/use-target-sites";
import { formatDate } from "@/components/target-provenance";
import { DEFAULT_WEIGHTS, DIMENSIONS } from "@/lib/similarity";

const TARGET_DATA_STALE_AFTER_DAYS = 180;

export function AboutDialog({ pipeline }: { pipeline: TargetsData }) {
  const processedAt = new Date(pipeline.processedAt);
  const ageInDays = Math.floor((Date.now() - processedAt.getTime()) / (24 * 60 * 60 * 1000));
  const isStale = !Number.isFinite(processedAt.getTime()) || ageInDays >= TARGET_DATA_STALE_AFTER_DAYS;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card/60" data-testid="button-about">
          <Info className="mr-1.5 h-4 w-4" /> Data and method
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold">About the data and method</DialogTitle>
          <DialogDescription>How a score is made, and how far to trust it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm leading-relaxed">
          <p>
            Each Earth site is compared to the chosen Moon or Mars site on seven dimensions. Each dimension produces a similarity between 0 and 1. The overall fit index is the weighted
            average of the seven, scaled to 0-100. It changes with the weights you set, so it is a fit under your current priorities, not a probability or a validated suitability rating. Pressure and precipitation are compared on a log scale, so 85 versus 90 kPa is close but 0.7 versus 90 kPa is far. Geology rewards
            covering the target's settings more than it penalises extra Earth features. Wind and dust combines mean wind speed (60%) with aridity from annual rainfall (40%).
          </p>
          <p>
            The global search scores every land cell of a 4° grid with the same functions but only on the five dimensions that can be measured everywhere: temperature, air and water, terrain,
            sun geometry, and wind and dust. Geology and isolation are not scored there. A coarse 0.5° rock-type map (GLiM) is shown for context only. Cells within 600 km of a site in this catalogue are hidden, but nobody has checked whether the remaining leads are already used elsewhere, so each one is a preliminary candidate to investigate, not a confirmed or new analog.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="rounded-sm border border-foreground/10 bg-muted/50 px-3 py-2">
                <div className="flex justify-between font-semibold"><span>{d.label}</span><span className="font-mono text-xs text-muted-foreground">default {DEFAULT_WEIGHTS[d.key]}</span></div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
            ))}
          </div>
          <div data-testid="section-data-pipeline">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Data pipeline (Moon and Mars)</div>
            <p className="mb-2">
              Moon and Mars numbers are not typed in. A rerunnable pipeline reads public planetary data and queries the Mars Climate Database model, checks the responses and extracts values for each target. It last ran on {formatDate(pipeline.processedAt)}.
              Every value is stored with its source product, URL, processing date, pixel size and cleaning note, and carries one of three labels:
              {" "}<span className="font-mono font-semibold">raw-derived</span> (computed from raw files),
              {" "}<span className="font-mono font-semibold">derived</span> (model output or a stated calculation) or
              {" "}<span className="font-mono font-semibold">reference</span> (a fixed value, not computed).
            </p>
            <p
              className={`rounded-sm border-l-2 px-3 py-2 text-xs ${isStale ? "border-destructive bg-destructive/10 text-foreground" : "border-primary bg-primary/10"}`}
              data-testid="pipeline-freshness"
            >
              {isStale
                ? `Stale: this snapshot is at least ${TARGET_DATA_STALE_AFTER_DAYS} days old. Refresh it with “pnpm --filter @workspace/api-server run ingest:targets”.`
                : `Current: this snapshot is less than ${TARGET_DATA_STALE_AFTER_DAYS} days old. It is configured to refresh automatically every three months through GitHub Actions, once the repository is hosted on GitHub. You can also run “pnpm --filter @workspace/api-server run ingest:targets”.`}
            </p>
            <ol className="mb-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li><span className="font-semibold text-foreground">Read</span>: needed map pixels by HTTP range request, MCS profiles, and the MCD model wind response.</li>
              <li><span className="font-semibold text-foreground">Validate</span>: file sizes, formats, scales, missing codes, quality flags and the MCD seasonal/local-time grid.</li>
              <li><span className="font-semibold text-foreground">Clean</span>: mask missing codes, reject physically impossible temperatures, apply quality flags.</li>
              <li><span className="font-semibold text-foreground">Process</span>: pool valid pixels or nearby profiles, and average MCD wind across its seasonal and local-time grid.</li>
              <li><span className="font-semibold text-foreground">Check</span>: compare against published figures, and stop if any check fails.</li>
            </ol>
            <ul className="divide-y divide-foreground/10 rounded-sm border border-foreground/10">
              {pipeline.datasets.map((d) => (
                <li key={d.name} className="px-3 py-2" data-testid={`dataset-${d.name}`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <a href={d.url} target="_blank" rel="noreferrer" className="font-medium underline decoration-foreground/30">{d.name}</a>
                    <span className="font-mono text-xs text-muted-foreground">{d.kind} · {d.body}</span>
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
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Data sources</div>
            <ul className="divide-y divide-foreground/10 rounded-sm border border-foreground/10">
              {DATA_SOURCES.map((s) => (
                <li key={s.name} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className={s.kind === "measured" || s.kind === "raw-derived" ? "font-mono font-semibold text-foreground" : "font-mono"}>{s.kind}</span> · <span className="font-mono">{s.body}</span> · {s.use}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-sm border-l-2 border-primary bg-primary/10 px-3 py-2">
            Honesty note: for Earth, temperature is the 2001-2025 NASA POWER skin (surface) temperature climatology (MERRA-2, about 50 km resolution, so mountain sites are smoothed); precipitation, pressure and wind come from the same
            dataset, and relief is the height range of 9 samples from a global terrain model: the point and 8 neighbours ±0.15° (about 17 km) away; on the Moon and Mars the ring is ±15 km. Earth "coldest" is the coldest month's mean daily minimum (POWER TS_MIN_AVG), not the single most extreme night. For the Moon and Mars, "coldest" is the mean of the coldest 10% of night
            samples and "warmest" the mean of the warmest 10% of day samples, so the two definitions are close but not identical. Moon and Mars temperatures come from one year of Diviner maps and one Mars year of sampled MCS
            profiles, not a full multi-year climatology. Mars wind is a 10 m MCD v6.2 model climatology, not a rover measurement or forecast; Mars pressure is also a model. Geology tags, isolation scores and analog status are editorial judgments; where a source is known it is linked on the site, and a documented past mission is not taken as proof that a facility operates today. No Earth site can reproduce
            lunar or Martian air pressure, gravity or radiation; the scores measure how good a rehearsal is, not an equivalence.
          </p>
          <p className="text-xs text-muted-foreground">Built for the NASA Space Apps Challenge 2026. Earth data from NASA POWER, a global DEM and NASA GIBS imagery; Moon and Mars data from LRO, MGS and MRO products processed by the pipeline.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
