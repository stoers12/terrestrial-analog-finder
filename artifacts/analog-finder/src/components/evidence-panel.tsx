import { ExternalLink, FileSearch, Layers } from "lucide-react";
import type { Site } from "@/data/sites";
import { LITHOLOGY, SITE_EVIDENCE, STATUS_POLICY, siteLithology, type EvidenceSource } from "@/data/evidence";
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

/** Moon or Mars target: scale and interpretation limits, cited reference measurements and sources. */
export function TargetEvidence({ target }: { target: Site }) {
  const ev = SITE_EVIDENCE[target.id];
  if (!ev) return null;
  return (
    <div className="mt-3 rounded-sm border border-secondary-foreground/15 bg-secondary-foreground/5 p-2.5 text-[11px] leading-snug" data-testid="panel-target-evidence">
      {ev.reference && (
        <div className="mb-2">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-widest opacity-60">Reference values from the cited atlas</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {ev.reference.map((r) => (
              <div key={r.label} className="rounded-sm bg-secondary-foreground/10 px-2 py-1">
                <div className="text-[9px] uppercase tracking-wider opacity-60">{r.label}</div>
                <div className="font-mono font-semibold">{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {ev.caveat && <p className="opacity-85">{ev.caveat}</p>}
      <div className="opacity-85">
        <SourceList sources={ev.sources} inverted />
      </div>
    </div>
  );
}
