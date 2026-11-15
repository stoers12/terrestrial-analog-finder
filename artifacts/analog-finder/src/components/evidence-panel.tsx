import { ExternalLink, FileSearch, ImageIcon, Layers, Snowflake, Sparkles } from "lucide-react";
import type { Site } from "@/data/sites";
import { LITHOLOGY, LROC_PITS, SITE_EVIDENCE, STATUS_POLICY, siteLithology, type EvidenceSource } from "@/data/evidence";
import { EARTH_IMAGERY, MOON_GEOLOGY, POLAR, earthImageUrl, findPit, fmtDepth, fmtDims, fmtPitCentre, moonUnit, polarImage, type PolarContext } from "@/data/pack";
import { STATUS_HINT, STATUS_LABEL } from "@/lib/analog-ui";
import { cn } from "@/lib/utils";

function SourceList({ sources, inverted }: { sources: EvidenceSource[]; inverted?: boolean }) {
  if (!sources.length) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {sources.map((s) => (
        <li key={s.url} className="text-[11px] leading-snug">
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={cn("inline-flex items-center gap-1 font-medium underline", inverted ? "decoration-secondary-foreground/40" : "decoration-foreground/30 hover:text-foreground")}
            data-testid="link-evidence-source"
          >
            {s.publisher}: {s.title} <ExternalLink className="h-3 w-3" />
          </a>
          <div className="opacity-75">{s.supports}</div>
        </li>
      ))}
    </ul>
  );
}

/** Earth site: analog status split into documented activity, current status and novelty, with sources and regional lithology. */
export function EarthEvidence({ site }: { site: Site }) {
  const ev = SITE_EVIDENCE[site.id];
  const lith = siteLithology(site);
  const status = site.status ?? "established";
  const rows: [string, string][] = [
    ["Analog status", `${STATUS_LABEL[status]}: ${STATUS_HINT[status]}`],
    ...(ev?.documented ? ([["Documented research or missions", ev.documented]] as [string, string][]) : []),
    ...(ev?.currentStatus ? ([["Operating today", ev.currentStatus]] as [string, string][]) : []),
    ...(ev?.novelty ? ([["How new the proposal is", ev.novelty]] as [string, string][]) : []),
    ...(ev?.caveat ? ([["Geology note", ev.caveat]] as [string, string][]) : []),
  ];
  return (
    <div className="space-y-3 rounded-sm border border-foreground/10 bg-muted/40 p-3 text-xs" data-testid="panel-earth-evidence">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <FileSearch className="h-3.5 w-3.5" /> Evidence and status
        </div>
        <dl className="space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="text-muted-foreground">
          <SourceList sources={ev?.sources ?? []} />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">{STATUS_POLICY}</p>
      </div>
      <div className="border-t border-foreground/10 pt-2.5" data-testid="text-site-lithology">
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> Regional lithology (GLiM, {LITHOLOGY.resolutionDeg}° pixels)
        </div>
        {lith ? (
          <p>
            {lith.atPoint ? <>At the site's coordinates: <b>{lith.atPoint}</b>.</> : <>No GLiM class at the site's coordinates (coast or no data).</>}
            {lith.nearby.length > 0 && (
              <span className="text-muted-foreground"> Surrounding 3 × 3 pixels (about ±55 km): {lith.nearby.map((n) => `${n.name.toLowerCase()} ${n.n}`).join(", ")}.</span>
            )}
          </p>
        ) : (
          <p className="text-muted-foreground">Not available for this site.</p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">
          Broad regional context from{" "}
          <a href={LITHOLOGY.url} target="_blank" rel="noreferrer" className="underline decoration-foreground/30">Hartmann &amp; Moosdorf (2012)</a>, {LITHOLOGY.license}. It does not set the geology tags and is not part of the score.
        </p>
      </div>
    </div>
  );
}

/** Moon or Mars target: scale and interpretation limits, cited reference measurements, map unit and sources. */
export function TargetEvidence({ target }: { target: Site }) {
  const ev = SITE_EVIDENCE[target.id];
  const pit = target.lrocPit ? findPit(target.lrocPit) : null;
  const unit = target.body === "moon" ? moonUnit(target) : null;
  const polar = POLAR.sites[target.id];
  const reference =
    ev?.reference ??
    (pit
      ? [
          { label: "Pit centre (LROC)", value: fmtPitCentre(pit) },
          { label: "Funnel diameter", value: fmtDims(pit.funnelMaxM, pit.funnelMinM) },
          { label: "Inner diameter", value: fmtDims(pit.innerMaxM, pit.innerMinM) },
          { label: "Depth", value: fmtDepth(pit) },
        ]
      : null);
  const sources = ev?.sources ?? (pit ? [LROC_PITS] : []);
  const caveat = ev?.caveat ?? (pit ? PIT_CAVEAT : null);
  if (!reference && !caveat && !unit && !polar && sources.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5 rounded-sm border border-secondary-foreground/15 bg-secondary-foreground/5 p-2.5 text-[11px] leading-snug" data-testid="panel-target-evidence">
      {pit && (
        <div className="inline-flex items-center gap-1.5 rounded-sm bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-secondary-foreground" data-testid="badge-lroc-added">
          <Sparkles className="h-3 w-3" /> Added from the LROC pit atlas
        </div>
      )}
      {reference && (
        <div>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-widest opacity-60">Reference values from the cited atlas</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {reference.map((r) => (
              <div key={r.label} className="rounded-sm bg-secondary-foreground/10 px-2 py-1">
                <div className="text-[9px] uppercase tracking-wider opacity-60">{r.label}</div>
                <div className="font-mono font-semibold">{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {unit && <MoonUnitNote unit={unit} />}
      {polar && <PolarContextPanel context={polar} />}
      {caveat && <p className="opacity-85">{caveat}</p>}
      <div className="opacity-85">
        <SourceList sources={sources} inverted />
      </div>
    </div>
  );
}

const PIT_CAVEAT = "The pit is a surface opening. Its size says nothing certain about a lava tube's length, shape or conditions underground.";

function MoonUnitNote({ unit }: { unit: NonNullable<ReturnType<typeof moonUnit>> }) {
  return (
    <div className="border-t border-secondary-foreground/10 pt-2" data-testid="text-moon-unit">
      <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest opacity-60">
        <Layers className="h-3 w-3" /> USGS map unit at the target ({MOON_GEOLOGY.scale})
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-3 w-3 shrink-0 rounded-[2px] border border-secondary-foreground/30" style={{ background: unit.color ?? "transparent" }} aria-hidden="true" />
        <div>
          <b>{unit.name}</b> <span className="font-mono opacity-70">({unit.code}, {unit.period})</span>
          {unit.interpretation && <span className="opacity-85">. Interpreted as: {unit.interpretation.replace(/\.$/, "")}.</span>}
          {unit.description && <div className="mt-0.5 opacity-70">{unit.description}</div>}
        </div>
      </div>
      <p className="mt-1 text-[10px] opacity-60">
        <a href={MOON_GEOLOGY.url} target="_blank" rel="noreferrer" className="underline decoration-secondary-foreground/40">USGS unified geologic map</a>. Regional context only; it does not set the geology tags and is not part of the score.
      </p>
    </div>
  );
}

const k2c = (k: number | null) => (k == null ? "n/a" : `${Math.round(k - 273.15)} °C`);

function PolarContextPanel({ context }: { context: PolarContext }) {
  const valid = ["surface", "shallow", "mid", "deep"].reduce((n, id) => n + (context.depthCounts[id] ?? 0), 0);
  return (
    <div className="border-t border-secondary-foreground/10 pt-2" data-testid="panel-polar-context">
      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest opacity-60">
        <Snowflake className="h-3 w-3" /> Polar thermal model, {context.radiusKm} km around the pack's point
      </div>
      <div className="grid gap-3 sm:grid-cols-[132px_minmax(0,1fr)]">
        <figure className="relative">
          <img src={polarImage(context)} alt={`Modelled ice-stability depth classes within ${context.radiusKm} km`} className="aspect-square w-full rounded-sm bg-black/40 [image-rendering:pixelated]" loading="lazy" />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-transparent" aria-hidden="true" />
          <figcaption className="mt-1 text-[9px] opacity-60">Polar stereographic, {context.imageRangeKm * 2} km across</figcaption>
        </figure>
        <div className="space-y-1.5">
          <ul className="space-y-0.5">
            {POLAR.depthClasses.map((c) => {
              const n = context.depthCounts[c.id] ?? 0;
              return (
                <li key={c.id} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: c.color }} aria-hidden="true" />
                  <span className="flex-1 opacity-85">{c.label}</span>
                  <span className="font-mono tabular-nums opacity-80">{((n / context.rows) * 100).toFixed(1)}%</span>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-2 gap-1.5 font-mono">
            <div className="rounded-sm bg-secondary-foreground/10 px-2 py-1">
              <div className="font-sans text-[9px] uppercase tracking-wider opacity-60">Annual mean at 2 cm depth</div>
              <div className="font-semibold">{k2c(context.mean2cmK.median)}</div>
              <div className="text-[9px] opacity-60">10th–90th pct {k2c(context.mean2cmK.p10)} to {k2c(context.mean2cmK.p90)}</div>
            </div>
            <div className="rounded-sm bg-secondary-foreground/10 px-2 py-1">
              <div className="font-sans text-[9px] uppercase tracking-wider opacity-60">Annual max at surface</div>
              <div className="font-semibold">{k2c(context.maxSurfaceK.median)}</div>
              <div className="text-[9px] opacity-60">10th–90th pct {k2c(context.maxSurfaceK.p10)} to {k2c(context.maxSurfaceK.p90)}</div>
            </div>
          </div>
          <p className="text-[10px] opacity-70">
            {context.rows.toLocaleString("en-US")} model points; {valid.toLocaleString("en-US")} have a valid modelled depth. Medians across the circle, converted from kelvin.
          </p>
        </div>
      </div>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] opacity-70">
        {POLAR.limits.slice(0, 3).map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p className="mt-1 text-[10px] opacity-60">
        Source: <a href={POLAR.productUrl} target="_blank" rel="noreferrer" className="underline decoration-secondary-foreground/40">{POLAR.product}</a> (LRO Diviner polar resource product).
      </p>
    </div>
  );
}

/** NASA GIBS context image around an Earth site, with the app's point marked. */
export function EarthImageContext({ site }: { site: Site }) {
  const img = EARTH_IMAGERY.sites[site.id];
  if (!img) return null;
  const [w, s, e, n] = img.bbox;
  return (
    <figure className="overflow-hidden rounded-sm border border-foreground/15 bg-muted" data-testid="figure-earth-image">
      <div className="relative">
        <img src={earthImageUrl(img)} alt={`NASA GIBS context image around ${site.name}`} className="aspect-square w-full object-cover" loading="lazy" />
        {img.marker && (
          <span
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.35)]"
            style={{ left: `${img.marker.x * 100}%`, top: `${img.marker.y * 100}%` }}
            aria-hidden="true"
          />
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-[9px] text-white">
          {Math.abs(s).toFixed(1)}°{s < 0 ? "S" : "N"}–{Math.abs(n).toFixed(1)}°{n < 0 ? "S" : "N"} · {Math.abs(w).toFixed(1)}°{w < 0 ? "W" : "E"}–{Math.abs(e).toFixed(1)}°{e < 0 ? "W" : "E"}
        </span>
      </div>
      <figcaption className="space-y-0.5 p-2 text-[10px] leading-snug text-muted-foreground">
        <div className="flex items-center gap-1 font-mono uppercase tracking-widest"><ImageIcon className="h-3 w-3" /> Regional context · NASA GIBS</div>
        <div>{img.marker ? "The ring marks the site's coordinates. " : "The site's coordinates fall just outside this frame. "}{EARTH_IMAGERY.note}</div>
        <a href={img.requestUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-foreground/30">
          {img.layer.replace(/_/g, " ")} <ExternalLink className="h-3 w-3" />
        </a>
      </figcaption>
    </figure>
  );
}
