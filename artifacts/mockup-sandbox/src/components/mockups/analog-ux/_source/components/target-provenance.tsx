import { KIND_HINT, KIND_LABEL, VARIABLE_LABEL, type Site, type TargetVariable, type ValueKind } from "@/components/mockups/analog-ux/_source/data/sites";
import { cn } from "@/components/mockups/analog-ux/_source/lib/utils";

const KIND_STYLE: Record<ValueKind, string> = {
  "raw-derived": "border-secondary-foreground/50",
  derived: "border-dashed border-secondary-foreground/50",
  reference: "border-dotted border-secondary-foreground/40 opacity-80",
};

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function KindBadge({ kind, className }: { kind: ValueKind; className?: string }) {
  return (
    <span title={KIND_HINT[kind]} className={cn("rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wider", KIND_STYLE[kind], className)}>
      {KIND_LABEL[kind]}
    </span>
  );
}

const ORDER: TargetVariable[] = ["meanTempC", "minTempC", "maxTempC", "elevationM", "reliefM", "pressureKpa", "windMs"];

/** Per-value provenance for a Moon or Mars target: label, source product, date, pixel size and cleaning note. */
export function TargetProvenance({ target }: { target: Site }) {
  const data = target.targetData;
  if (!data) return null;
  return (
    <details className="group text-[11px] text-muted-foreground" data-testid="details-target-provenance">
      <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-widest hover:text-foreground">
        Where each {target.body === "moon" ? "Moon" : "Mars"} number comes from
      </summary>
      <ul className="mt-2 space-y-2">
        {ORDER.map((k) => {
          const v = data.values[k];
          return (
            <li key={k} className="rounded-sm border border-foreground/10 bg-muted/40 px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{VARIABLE_LABEL[k]}</span>
                <KindBadge kind={v.kind} className="border-foreground/40" />
                <span className="font-mono text-foreground">{v.value}</span>
              </div>
              <div className="mt-0.5">
                <a href={v.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-foreground/30 hover:text-foreground">{v.product}</a>
                {" · "}processed {formatDate(v.processedAt)} · pixel size {v.pixelSize}
                {v.samples !== null && <> · {v.samples.toLocaleString("en-US")} {v.samples === 1 || v.samples === 9 ? "sample" : "samples"}</>}
              </div>
              <div className="mt-0.5 opacity-80">{v.cleaningNote}</div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** Definitions of the temperature numbers, which differ between Earth and the Moon/Mars. */
export function TemperatureDefinitions({ body }: { body: "moon" | "mars" }) {
  return (
    <p className="text-[11px] text-muted-foreground" data-testid="text-temperature-definitions">
      All temperatures are surface (skin) temperatures. Mean is the annual mean on Earth, and the average of the day and night means on {body === "moon" ? "the Moon" : "Mars"}.
      Coldest is the coldest month's mean daily minimum on Earth, and the mean of the coldest 10% of night samples on {body === "moon" ? "the Moon" : "Mars"}.
    </p>
  );
}
