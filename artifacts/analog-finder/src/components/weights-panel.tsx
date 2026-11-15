import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEIGHTS, DIMENSIONS, type DimensionKey, type Weights } from "@/lib/similarity";

interface Props {
  weights: Weights;
  onChange: (key: DimensionKey, value: number) => void;
  onReset: () => void;
}

export function WeightsPanel({ weights, onChange, onReset }: Props) {
  const total = DIMENSIONS.reduce((a, d) => a + weights[d.key], 0);
  const dirty = DIMENSIONS.some((d) => weights[d.key] !== DEFAULT_WEIGHTS[d.key]);
  return (
    <section className="rounded-md border border-foreground/15 bg-card/80 p-4" data-testid="panel-weights">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Mission priorities</div>
          <h3 className="font-display text-lg font-bold">Dimension weights</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onReset} disabled={!dirty} data-testid="button-reset-weights">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>
      {/* stacked share bar */}
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
        {DIMENSIONS.map((d, i) => (
          <div
            key={d.key}
            className="h-full transition-[flex-grow] duration-500"
            style={{ flexGrow: weights[d.key], background: `hsl(${16 + i * 38} ${60 - i * 4}% ${48 + i * 3}%)` }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-4">
        {DIMENSIONS.map((d, i) => (
          <div key={d.key}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <i className="inline-block h-2 w-2 rounded-full" style={{ background: `hsl(${16 + i * 38} ${60 - i * 4}% ${48 + i * 3}%)` }} />
                {d.label}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {weights[d.key]} <span className="opacity-60">· {total ? Math.round((weights[d.key] / total) * 100) : 0}%</span>
              </span>
            </div>
            <Slider
              value={[weights[d.key]]}
              min={0}
              max={10}
              step={1}
              onValueChange={(v) => onChange(d.key, v[0])}
              data-testid={`slider-weight-${d.key}`}
            />
            <div className="mt-1 text-[11px] text-muted-foreground">{d.description}</div>
          </div>
        ))}
      </div>
      {total === 0 && <p className="mt-3 text-xs text-destructive">All weights are zero, so every site scores 0. Raise at least one.</p>}
    </section>
  );
}
