import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { KIND_HINT } from "@/data/sites";
import { cn } from "@/lib/utils";

export type Prov = "measured" | "raw-derived" | "derived" | "reference" | "editorial";

const PROV_CLASS: Record<Prov, string> = {
  measured: "prov-measured",
  "raw-derived": "prov-derived",
  derived: "prov-derived prov-dashed",
  reference: "prov-reference",
  editorial: "prov-editorial",
};

const PROV_HINT: Record<Prov, string> = {
  measured: "Measured on Earth: NASA POWER climatology and a global elevation model",
  "raw-derived": KIND_HINT["raw-derived"],
  derived: KIND_HINT.derived,
  reference: KIND_HINT.reference,
  editorial: "Editorial judgement from published literature; not measured",
};

/** Provenance tag: colour + marker shape encode the kind; the word is always printed. */
export function ProvTag({ kind, className, compact }: { kind: Prov; className?: string; compact?: boolean }) {
  return (
    <span
      title={PROV_HINT[kind]}
      className={cn(
        "prov inline-flex shrink-0 items-center gap-1 rounded-[3px] border font-mono font-medium uppercase tracking-wider",
        compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-px text-[9px]",
        PROV_CLASS[kind],
        className,
      )}
    >
      {kind}
    </span>
  );
}

/** Small mono eyebrow + display title used to open every panel. */
export function PanelHead({ index, eyebrow, title, right, className }: { index?: string; eyebrow: string; title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {index && <span className="rounded-[2px] bg-secondary px-1 py-px text-[9px] tracking-widest text-secondary-foreground">{index}</span>}
          {eyebrow}
        </div>
        <h3 className="font-display mt-0.5 text-lg font-extrabold leading-tight">{title}</h3>
      </div>
      {right}
    </div>
  );
}

export function Panel({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...rest} className={cn("panel relative rounded-lg border border-foreground/12 bg-card/85 backdrop-blur-sm", className)}>
      {children}
    </section>
  );
}

export type MatchTone = "holds" | "partial" | "breaks";
export const matchTone = (v: number): MatchTone => (v >= 0.65 ? "holds" : v >= 0.5 ? "partial" : "breaks");

/** A 0-100 shared scale with the break / partial / hold zones drawn under the reading. */
export function MatchScale({ value, delay = 0, height = 10 }: { value: number; delay?: number; height?: number }) {
  const tone = matchTone(value);
  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute inset-0 flex overflow-hidden rounded-[2px]">
        <div className="zone-breaks h-full" style={{ width: "50%" }} />
        <div className="h-full bg-foreground/[.05]" style={{ width: "15%" }} />
        <div className="zone-holds h-full" style={{ width: "35%" }} />
      </div>
      <div className="pointer-events-none absolute inset-0 tick-scale" />
      <motion.div
        className={cn("absolute inset-y-[2px] left-0 origin-left rounded-[1px]", tone === "breaks" ? "bg-primary" : tone === "partial" ? "bg-foreground/45" : "bg-foreground")}
        style={{ width: "100%" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.max(0.005, value) }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay }}
      />
      <motion.div
        className="absolute -inset-y-[3px] w-[2px] bg-foreground"
        initial={{ left: "0%" }}
        animate={{ left: `calc(${value * 100}% - 1px)` }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay }}
      />
    </div>
  );
}

export function ToneTag({ tone }: { tone: MatchTone }) {
  return (
    <span
      className={cn(
        "inline-flex w-[52px] justify-center rounded-[2px] px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider",
        tone === "holds" ? "bg-secondary text-secondary-foreground" : tone === "partial" ? "border border-foreground/30 text-foreground/70" : "bg-primary text-primary-foreground",
      )}
    >
      {tone}
    </span>
  );
}

export interface ValueCell {
  text: string;
  kind?: Prov;
}

export interface LedgerRow {
  key: string;
  label: string;
  description: string;
  score: number;
  weight?: number;
  target: ValueCell[];
  earth: ValueCell[];
}

/** Dimension-by-dimension comparison on one shared 0-100 scale, with each raw value and its provenance. */
export function DimensionLedger({ rows, targetLabel, earthLabel }: { rows: LedgerRow[]; targetLabel: string; earthLabel: string }) {
  return (
    <div data-testid="ledger-dimensions">
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_40px_56px] items-end gap-3 px-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:grid-cols-[150px_minmax(0,1fr)_40px_56px]">
        <span className="hidden md:block">Dimension</span>
        <div className="flex justify-between">
          <span>0</span><span>50</span><span>65</span><span>100</span>
        </div>
        <span className="text-right">match</span>
        <span />
      </div>
      <div className="divide-y divide-foreground/[.07] rounded-md border border-foreground/10 bg-background/40">
        {rows.map((r, i) => (
          <div key={r.key} className="group px-3 py-2.5 transition-colors hover:bg-foreground/[.025]" data-testid={`ledger-row-${r.key}`}>
            <div className="grid grid-cols-[minmax(0,1fr)_40px_56px] items-center gap-3 md:grid-cols-[150px_minmax(0,1fr)_40px_56px]">
              <div className="col-span-3 flex items-baseline gap-2 md:col-span-1">
                <span className="text-sm font-semibold">{r.label}</span>
                {r.weight !== undefined && <span className="font-mono text-[10px] text-muted-foreground">w{r.weight}</span>}
              </div>
              <MatchScale value={r.score} delay={i * 0.04} />
              <span className="text-right font-mono text-sm font-bold tabular-nums">{Math.round(r.score * 100)}</span>
              <ToneTag tone={matchTone(r.score)} />
            </div>
            <div className="mt-1.5 grid gap-1 text-[11px] sm:grid-cols-2 md:pl-[162px]">
              <ValueLine who={targetLabel} accent cells={r.target} />
              <ValueLine who={earthLabel} cells={r.earth} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueLine({ who, cells, accent }: { who: string; cells: ValueCell[]; accent?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn("w-12 shrink-0 font-mono text-[9px] uppercase tracking-widest", accent ? "text-body-accent" : "text-muted-foreground")}>{who}</span>
      {cells.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="font-mono text-foreground">{c.text}</span>
          {c.kind && <ProvTag kind={c.kind} compact />}
        </span>
      ))}
    </div>
  );
}

/** "What to test" and "where it breaks" columns, shared by site and discovery detail. */
export function RehearsalColumns({ tests, gaps, emptyTests, emptyGaps }: { tests: string[]; gaps: string[]; emptyTests: string; emptyGaps: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="panel-rehearsal">
      <div className="rounded-md border border-foreground/12 bg-background/50">
        <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider">What a team could test here</span>
          <span className="font-mono text-[10px] text-muted-foreground">{tests.length}</span>
        </div>
        <ol className="space-y-2 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {(tests.length ? tests : [emptyTests]).map((t, i) => (
            <li key={i} className="flex gap-2"><span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />{t}</li>
          ))}
        </ol>
      </div>
      <div className="rounded-md border border-primary/35 bg-primary/[.04]">
        <div className="flex items-center justify-between border-b border-primary/20 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Where the analogy breaks</span>
          <span className="font-mono text-[10px] text-primary/80">{gaps.length}</span>
        </div>
        <ol className="space-y-2 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {(gaps.length ? gaps : [emptyGaps]).map((t, i) => (
            <li key={i} className="flex gap-2"><span className="mt-[4px] h-2 w-2 shrink-0 rotate-45 border border-primary" />{t}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function LimitsStrip({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="border-t border-foreground/10 bg-secondary p-5 text-secondary-foreground">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] opacity-70">
        <span className="h-px w-6 bg-primary" /> What no Earth site can rehearse
      </div>
      <div className="grid gap-px overflow-hidden rounded-md bg-secondary-foreground/10 sm:grid-cols-3">
        {items.map((l, i) => (
          <div key={l.title} className="bg-secondary px-3 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-primary">0{i + 1}</span>
              <span className="font-display text-sm font-bold">{l.title}</span>
            </div>
            <div className="mt-1 text-xs leading-relaxed opacity-75">{l.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
