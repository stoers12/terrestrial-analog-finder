import { useEffect, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { Check, MousePointerClick, X } from "lucide-react";
import { GEOLOGY_LABELS, type Site } from "@/data/sites";
import { DIMENSIONS, type Dimension, type DimensionScores, type Match } from "@/lib/similarity";
import { DimensionLedger, LimitsStrip, Panel, ProvTag, RehearsalColumns } from "@/components/instrument";
import { buildLedgerRows } from "@/components/ledger-rows";
import { explain, fmt, limits, rehearsal, scoreColor, STATUS_HINT, STATUS_LABEL, verdict } from "@/lib/analog-ui";
import { StatusGlyph } from "@/components/ranked-list";
import { TargetProvenance, TemperatureDefinitions } from "@/components/target-provenance";

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const c = animate(prev.current, value, {
      duration: 0.8,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(1);
      },
    });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <span ref={ref}>{value.toFixed(1)}</span>;
}

export function Radar({ dimensions = DIMENSIONS, values }: { dimensions?: Dimension[]; values: Partial<DimensionScores> }) {
  const R = 92;
  const cx = 130;
  const cy = 120;
  const n = dimensions.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const path = (vals: number[]) =>
    vals.map((v, i) => pt(i, Math.max(0.02, v) * R)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
  const vals = dimensions.map((d) => values[d.key] ?? 0);
  return (
    <svg viewBox="0 0 260 240" className="mx-auto w-full max-w-[280px]" data-testid="chart-radar">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <path key={r} d={path(Array(n).fill(r))} fill="none" stroke="hsl(var(--foreground) / .14)" strokeDasharray={r === 1 ? "" : "2 3"} />
      ))}
      {dimensions.map((d, i) => {
        const [x, y] = pt(i, R);
        const [lx, ly] = pt(i, R + 18);
        return (
          <g key={d.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--foreground) / .12)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" style={{ font: "500 10px var(--app-font-sans)" }}>
              {d.label}
            </text>
          </g>
        );
      })}
      <motion.path
        initial={false}
        animate={{ d: path(vals) }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        fill="hsl(var(--body-accent) / .16)"
        stroke="hsl(var(--body-accent))"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {vals.map((v, i) => {
        const [x, y] = pt(i, Math.max(0.02, v) * R);
        return <motion.circle key={i} initial={false} animate={{ cx: x, cy: y }} transition={{ type: "spring", stiffness: 140, damping: 18 }} r={3} fill="hsl(var(--foreground))" />;
      })}
    </svg>
  );
}

interface Props {
  target: Site;
  match: Match | null;
  rank: number;
}

/** Big score readout with a 0-100 arc and the verdict underneath. */
export function ScoreGauge({ score, caption, sub }: { score: number; caption: string; sub: string }) {
  const r = 46;
  const c = Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[70px] w-[120px]">
        <svg viewBox="0 0 120 70" className="h-full w-full">
          <path d="M14 62 A46 46 0 0 1 106 62" fill="none" stroke="hsl(var(--foreground) / .1)" strokeWidth="8" strokeLinecap="round" />
          <motion.path
            d="M14 62 A46 46 0 0 1 106 62"
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - score / 100) }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          />
          {[0, 25, 50, 75, 100].map((t) => {
            const a = Math.PI * (1 - t / 100);
            return <line key={t} x1={60 + Math.cos(a) * 36} y1={62 - Math.sin(a) * 36} x2={60 + Math.cos(a) * 32} y2={62 - Math.sin(a) * 32} stroke="hsl(var(--foreground) / .35)" />;
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center font-mono text-[26px] font-bold leading-none tabular-nums" data-testid="text-detail-score">
          <CountUp value={score} />
        </div>
      </div>
      <div className="text-left">
        <div className="text-xs font-bold uppercase tracking-wider">{caption}</div>
        <div className="max-w-[180px] text-[11px] leading-snug text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

export function SiteDetail({ target, match, rank }: Props) {
  if (!match) {
    return (
      <Panel className="grid h-56 place-items-center border-dashed text-center">
        <div>
          <MousePointerClick className="mx-auto h-5 w-5 text-muted-foreground" />
          <div className="font-display mt-2 text-lg font-bold">No site under comparison</div>
          <div className="text-sm text-muted-foreground">Select an Earth site on the map or in the ranking.</div>
        </div>
      </Panel>
    );
  }
  const e = match.site;
  const v = verdict(match.score);
  const reh = rehearsal(target, e, match.dimensions, match.sharedGeology, match.missingGeology);
  const rows = buildLedgerRows(target, e, match.dimensions, { sharedGeology: match.sharedGeology.length });
  const bodyLabel = target.body === "moon" ? "Moon" : "Mars";
  const status = e.status ?? "established";
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${target.id}-${e.id}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
      >
        <Panel className="overflow-hidden" data-testid="panel-detail">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-body-accent" />
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-foreground/10 p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                <span className="rounded-[2px] bg-secondary px-1.5 py-px text-secondary-foreground">Rank {String(rank).padStart(2, "0")}</span>
                <span>Earth</span><span className="opacity-40">/</span><span className="truncate">{e.region}</span>
                <span className="opacity-40">/</span><span>{fmt.lat(e.lat)} {Math.abs(e.lon).toFixed(1)}° {e.lon >= 0 ? "E" : "W"}</span>
              </div>
              <h3 className="font-display mt-1 text-3xl font-extrabold leading-tight md:text-4xl" data-testid="text-detail-name">{e.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-foreground/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                  <StatusGlyph status={status} /> {STATUS_LABEL[status]}
                </span>
                <span className="text-muted-foreground">{STATUS_HINT[status]}</span>
              </div>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{e.summary}</p>
            </div>
            <ScoreGauge score={match.score} caption={v.label} sub={`against ${target.name}, all seven dimensions`} />
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-5">
              <Radar values={match.dimensions} />
              <div>
                <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Target geology</span><ProvTag kind="editorial" compact />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {match.sharedGeology.map((g) => (
                    <span key={g} className="flex items-center gap-1 rounded-[3px] bg-secondary px-2 py-1 text-xs text-secondary-foreground"><Check className="h-3 w-3" /> {GEOLOGY_LABELS[g]}</span>
                  ))}
                  {match.missingGeology.map((g) => (
                    <span key={g} className="flex items-center gap-1 rounded-[3px] border border-dashed border-primary/50 px-2 py-1 text-xs text-muted-foreground line-through decoration-primary/40"><X className="h-3 w-3 text-primary" /> {GEOLOGY_LABELS[g]}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 border-l-2 border-body-accent pl-3 text-[13px] leading-relaxed">
                {explain(target, match).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <DimensionLedger rows={rows} targetLabel={bodyLabel} earthLabel="Earth" />
              <RehearsalColumns tests={reh.tests} gaps={reh.gaps} emptyTests="Nothing matches strongly enough to recommend as a rehearsal." emptyGaps="No dimension is clearly weak for this pairing." />
              <div className="space-y-2 rounded-md border border-foreground/10 bg-background/40 p-3">
                <TemperatureDefinitions body={target.body as "moon" | "mars"} />
                <TargetProvenance target={target} />
                {e.measured && (
                  <p className="text-[11px] text-muted-foreground" data-testid="text-provenance">
                    <ProvTag kind="measured" className="mr-1.5" />{e.measured.climateSource}; {e.measured.elevationSource}. Fetched {new Date(e.measured.fetchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
                    Isolation and geology tags are editorial estimates.
                  </p>
                )}
              </div>
            </div>
          </div>
          <LimitsStrip items={limits(target, e)} />
        </Panel>
      </motion.div>
    </AnimatePresence>
  );
}
