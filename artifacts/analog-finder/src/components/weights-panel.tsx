import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEIGHTS, DIMENSIONS, MEASURABLE_DIMENSIONS, type DimensionKey, type Weights } from "@/lib/similarity";
import { Panel, PanelHead } from "@/components/instrument";
import { cn } from "@/lib/utils";

interface Props {
  weights: Weights;
  onChange: (key: DimensionKey, value: number) => void;
  onReset: () => void;
}

const dimColor = (i: number) => `hsl(${224 - i * 30} ${38 + i * 4}% ${30 + i * 6}%)`;

export function WeightsPanel({ weights, onChange, onReset }: Props) {
  const total = DIMENSIONS.reduce((a, d) => a + weights[d.key], 0);
  const dirty = DIMENSIONS.some((d) => weights[d.key] !== DEFAULT_WEIGHTS[d.key]);
  return (
    <Panel className="p-4" data-testid="panel-weights">
      <PanelHead
        index="04"
        eyebrow="Mission priorities"
        title="Dimension weights"
        right={
          <Button size="sm" variant="ghost" onClick={onReset} disabled={!dirty} data-testid="button-reset-weights" className="h-7 font-mono text-[10px] uppercase tracking-wider">
            <RotateCcw className="mr-1.5 h-3 w-3" /> Reset
          </Button>
        }
      />
      <div className="mt-3">
        <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          <span>Share of score</span><span>sum {total}</span>
        </div>
        <div className="flex h-3 gap-[2px] overflow-hidden rounded-[3px] bg-muted">
          {DIMENSIONS.map((d, i) => (
            <div key={d.key} title={d.label} className="h-full transition-[flex-grow] duration-500" style={{ flexGrow: weights[d.key], background: dimColor(i) }} />
          ))}
        </div>
      </div>
      <div className="mt-4 divide-y divide-foreground/[.07]">
        {DIMENSIONS.map((d, i) => {
          const share = total ? (weights[d.key] / total) * 100 : 0;
          const global = MEASURABLE_DIMENSIONS.includes(d.key);
          return (
            <div key={d.key} className={cn("py-2.5 transition-opacity", weights[d.key] === 0 && "opacity-55")}>
              <div className="flex items-center gap-3">
                <span className="w-[3px] self-stretch rounded-full" style={{ background: dimColor(i) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                      {d.label}
                      {global && <span title="Also drives the global grid search" className="rounded-[2px] border border-foreground/20 px-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">grid</span>}
                      {weights[d.key] !== DEFAULT_WEIGHTS[d.key] && <span className="h-1.5 w-1.5 rounded-full bg-primary" title={`Default ${DEFAULT_WEIGHTS[d.key]}`} />}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{share.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Slider
                      className="flex-1"
                      value={[weights[d.key]]}
                      min={0}
                      max={10}
                      step={1}
                      onValueChange={(v) => onChange(d.key, v[0])}
                      data-testid={`slider-weight-${d.key}`}
                    />
                    <span className="w-6 text-right font-mono text-base font-bold tabular-nums">{weights[d.key]}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{d.description}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {total === 0 && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">All weights are zero, so every site scores 0. Raise at least one.</p>}
    </Panel>
  );
}
