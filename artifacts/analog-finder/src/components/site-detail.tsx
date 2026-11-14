import { useEffect, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { Check, ShieldAlert, X } from "lucide-react";
import { GEOLOGY_LABELS, type Site } from "@/data/sites";
import { DIMENSIONS, type Dimension, type DimensionScores, type Match } from "@/lib/similarity";
import { explain, fmt, limits, rehearsal, scoreColor, STATUS_HINT, STATUS_LABEL, verdict } from "@/lib/analog-ui";
import { cn } from "@/lib/utils";

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
    <svg viewBox="0 0 260 240" className="w-full max-w-[300px]" data-testid="chart-radar">
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
        fill="hsl(var(--primary) / .22)"
        stroke="hsl(var(--primary))"
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

export function SiteDetail({ target, match, rank }: Props) {
  if (!match) {
    return (
      <div className="grid h-48 place-items-center rounded-md border border-dashed border-foreground/25 text-sm text-muted-foreground">
        Select an Earth site on the map or in the ranking to compare it.
      </div>
    );
  }
  const e = match.site;
  const v = verdict(match.score);
  const reh = rehearsal(target, e, match.dimensions, match.sharedGeology, match.missingGeology);
  const rows: [string, string, string, number?][] = [
    ["Mean temperature", fmt.temp(target.meanTempC), fmt.temp(e.meanTempC)],
    ["Coldest-month night", fmt.temp(target.minTempC), fmt.temp(e.minTempC)],
    ["Surface pressure", fmt.kpa(target.pressureKpa), fmt.kpa(e.pressureKpa)],
    ["Precipitation", fmt.mm(target.precipMm), fmt.mm(e.precipMm)],
    ["Wind (mean)", fmt.wind(target.windMs), fmt.wind(e.windMs)],
    ["Relief", fmt.ten(target.ruggedness), `${fmt.ten(e.ruggedness)}${e.measured ? ` (${fmt.metres(e.measured.reliefM)})` : ""}`],
    ["Isolation", fmt.ten(target.isolation), `${fmt.ten(e.isolation)} (est.)`],
    ["Latitude", fmt.lat(target.lat), fmt.lat(e.lat)],
  ];
  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={`${target.id}-${e.id}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
        className="rounded-md border border-foreground/15 bg-card/90"
        data-testid="panel-detail"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/10 p-5">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Rank {rank} · {e.region}
            </div>
            <h3 className="font-display text-3xl font-extrabold leading-tight" data-testid="text-detail-name">{e.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-sm px-1.5 py-0.5 font-mono uppercase tracking-wider text-[10px]", e.status === "proposed" ? "bg-primary text-primary-foreground" : "border border-foreground/40")}>
                {STATUS_LABEL[e.status ?? "established"]}
              </span>
              <span className="text-muted-foreground">{STATUS_HINT[e.status ?? "established"]}</span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{e.summary}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-5xl font-bold tabular-nums leading-none" style={{ color: scoreColor(match.score) }} data-testid="text-detail-score">
              <CountUp value={match.score} />
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wider">{v.label}</div>
            <div className="text-[11px] text-muted-foreground">vs {target.name}</div>
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[300px_minmax(0,1fr)]">
          <div>
            <Radar values={match.dimensions} />
            <div className="mt-2 space-y-1.5">
              {DIMENSIONS.map((d, i) => (
                <div key={d.key} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">{d.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full w-full origin-left rounded-full bg-secondary"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: match.dimensions[d.key] }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono tabular-nums">{Math.round(match.dimensions[d.key] * 100)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <table className="w-full text-sm" data-testid="table-raw-values">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="pb-2 text-left font-normal">Value</th>
                  <th className="pb-2 text-right font-normal text-body-accent">{target.body === "moon" ? "Moon" : "Mars"}</th>
                  <th className="pb-2 text-right font-normal">Earth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, a, b]) => (
                  <tr key={k} className="border-t border-foreground/8">
                    <td className="py-1.5 text-muted-foreground">{k}</td>
                    <td className="py-1.5 text-right font-mono">{a}</td>
                    <td className="py-1.5 text-right font-mono font-semibold">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Target geology</div>
              <div className="flex flex-wrap gap-1.5">
                {match.sharedGeology.map((g) => (
                  <span key={g} className="flex items-center gap-1 rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground"><Check className="h-3 w-3" /> {GEOLOGY_LABELS[g]}</span>
                ))}
                {match.missingGeology.map((g) => (
                  <span key={g} className="flex items-center gap-1 rounded-sm border border-dashed border-foreground/35 px-2 py-1 text-xs text-muted-foreground line-through decoration-foreground/30"><X className="h-3 w-3" /> {GEOLOGY_LABELS[g]}</span>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-sm leading-relaxed">
              {explain(target, match).map((p, i) => <p key={i}>{p}</p>)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2" data-testid="panel-rehearsal">
              <div className="rounded-sm border-l-2 border-secondary bg-muted/50 px-3 py-2">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider">What a team could test here</div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {reh.tests.length ? reh.tests.map((t, i) => <li key={i}>{t}</li>) : <li>Nothing matches strongly enough to recommend as a rehearsal.</li>}
                </ul>
              </div>
              <div className="rounded-sm border-l-2 border-primary bg-muted/50 px-3 py-2">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider">Where the analogy breaks</div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {reh.gaps.length ? reh.gaps.map((t, i) => <li key={i}>{t}</li>) : <li>No dimension is clearly weak for this pairing.</li>}
                </ul>
              </div>
            </div>

            {e.measured && (
              <p className="text-[11px] text-muted-foreground" data-testid="text-provenance">
                Measured values: {e.measured.climateSource}; {e.measured.elevationSource}. Fetched {new Date(e.measured.fetchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
                Isolation and geology tags are editorial estimates.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-foreground/10 bg-muted/50 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-primary" /> What no Earth site can rehearse</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {limits(target, e).map((l) => (
              <div key={l.title} className="rounded-sm border-l-2 border-primary bg-card/70 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider">{l.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{l.body}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
