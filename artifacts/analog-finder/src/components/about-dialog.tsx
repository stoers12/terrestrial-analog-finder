import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DATA_SOURCES } from "@/data/sites";
import { DEFAULT_WEIGHTS, DIMENSIONS } from "@/lib/similarity";

export function AboutDialog() {
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
            Each Earth site is compared to the chosen Moon or Mars site on six dimensions. Each dimension produces a similarity between 0 and 1. The overall score is the weighted
            average of the six, scaled to 0-100. Pressure and precipitation are compared on a log scale, so 85 versus 90 kPa is close but 0.7 versus 90 kPa is far. Geology rewards
            covering the target's settings more than it penalises extra Earth features.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="rounded-sm border border-foreground/10 bg-muted/50 px-3 py-2">
                <div className="flex justify-between font-semibold"><span>{d.label}</span><span className="font-mono text-xs text-muted-foreground">default {DEFAULT_WEIGHTS[d.key]}</span></div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Data sources</div>
            <ul className="divide-y divide-foreground/10 rounded-sm border border-foreground/10">
              {DATA_SOURCES.map((s) => (
                <li key={s.name} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground"><span className="font-mono">{s.body}</span> · {s.use}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-sm border-l-2 border-primary bg-primary/10 px-3 py-2">
            Honesty note: site values are indicative figures compiled from published mission and climate summaries. They are good enough to rank sites against each other, not
            survey-grade. A production version would ingest the raster datasets above directly and sample them per site. No Earth site can reproduce lunar or Martian air pressure,
            gravity or radiation; the scores measure how good a rehearsal is, not an equivalence.
          </p>
          <p className="text-xs text-muted-foreground">Built for the NASA Space Apps Challenge 2026 using open NASA and partner-agency data.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
