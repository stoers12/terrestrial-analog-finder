import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, Compass, Database, Globe2, Radar, ShieldAlert, Info } from "lucide-react";
import { useTargetSites } from "@/hooks/use-target-sites";
import { AboutDialog } from "@/components/about-dialog";
import { Button } from "@/components/ui/button";

export default function Welcome() {
  const targets = useTargetSites();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.title = "Terrestrial Analog Finder | Planetary Field Rehearsal";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Find where a Moon or Mars mission can rehearse on Earth—and see, dimension by dimension, where the analogy holds and where it fails.");
  }, []);

  const exampleBody = targets.data?.sites[0]?.body ?? "moon";
  const exampleRegion = targets.data?.sites[0]?.region ?? "South Pole";

  return (
    <div data-body={exampleBody} className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="group flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-home">
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Compass className="h-4 w-4 text-primary" />
              <motion.span className="absolute inset-[3px] rounded-full border border-body-accent/60 border-t-transparent" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }} />
            </div>
            <div>
              <div className="font-display text-base font-extrabold leading-none sm:text-lg">Terrestrial Analog Finder</div>
              <div className="hidden font-mono text-[9px] uppercase tracking-[0.19em] text-muted-foreground sm:block">Planetary field rehearsal</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-foreground/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground md:inline-flex">Independent · Space Apps 2026</span>
            {targets.data ? <AboutDialog pipeline={targets.data} /> : (
              <Button variant="outline" size="sm" className="bg-card/60 opacity-50" disabled data-testid="button-about">
                <Info className="mr-1.5 h-4 w-4" />
                Data and method
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden border-b border-foreground/10 bg-secondary text-secondary-foreground">
          <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_40%,hsl(var(--body-accent)/.35),transparent_44%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--secondary))_0%,transparent_75%)]" />
          </div>
          <div className="relative mx-auto grid min-h-[570px] max-w-[1500px] grid-cols-1 items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-5 md:py-20 lg:gap-10 lg:px-12">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative z-10 md:col-start-1 md:row-start-1"
            >
              <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-secondary-foreground/65">
                <span className="h-px w-8 bg-primary" /> A field-rehearsal instrument for other worlds
              </div>
              <h1 className="font-display max-w-[780px] text-[clamp(3.1rem,7.5vw,7.4rem)] font-extrabold leading-[.88] tracking-[-.065em]">
                Earth is our <span className="text-body-accent">test range.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-secondary-foreground/78 md:text-lg">
                Find where a Moon or Mars mission can rehearse on Earth—and see, dimension by dimension, where the analogy holds and where it fails.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/explorer" className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-sm bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group" data-testid="button-enter-explorer">
                  Open the live explorer
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="font-mono text-[10px] uppercase tracking-widest text-secondary-foreground/55">Live comparisons · transparent limits</span>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-secondary-foreground/15 pt-5 text-xs text-secondary-foreground/65">
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--moon))]" /> Lunar landing and base sites</span>
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--mars))]" /> Martian landing and base sites</span>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.12 }}
              className="relative mx-auto flex aspect-square w-full max-w-[490px] items-center justify-center md:col-start-2 md:row-start-1 md:justify-self-end max-md:aspect-auto max-md:grid max-md:grid-cols-2 max-md:gap-3 max-md:py-2"
              aria-label="Illustration of Earth as a planetary field site"
              data-testid="visual-planetary-fieldwork"
            >
              <div className="absolute inset-[8%] rounded-full border border-secondary-foreground/15" />
              <div className="absolute inset-[18%] rounded-full border border-dashed border-secondary-foreground/20" />
              <div className="absolute inset-[28%] rounded-full border border-secondary-foreground/10" />
              <motion.div
                className="absolute inset-[8%] rounded-full border border-transparent border-t-primary/90"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 36, ease: "linear" }}
              />
              <div className="relative z-[1] col-span-2 row-start-1 grid aspect-square w-[57%] place-items-center overflow-hidden rounded-full border border-secondary-foreground/20 bg-[radial-gradient(circle_at_34%_30%,hsl(168_34%_62%),hsl(183_30%_28%)_48%,hsl(222_43%_11%)_76%)] shadow-[inset_-28px_-16px_55px_hsl(222_47%_6%/.75),0_0_90px_hsl(var(--body-accent)/.14)] max-md:w-[70%]">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(166deg, transparent 0 18px, hsl(168 28% 80% / .15) 19px, transparent 20px 39px), repeating-linear-gradient(28deg, transparent 0 35px, hsl(16 75% 70% / .12) 36px, transparent 37px 70px)" }} />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(105deg,transparent_34%,hsl(222_47%_8%/.8)_100%)]" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <Radar className="h-8 w-8 text-primary" strokeWidth={1.2} />
                  <span className="mt-3 font-mono text-[9px] uppercase tracking-[.25em] text-secondary-foreground/70">Compare worlds</span>
                </div>
              </div>
              <div className="absolute right-[2%] top-[18%] rounded-sm border border-secondary-foreground/15 bg-secondary/85 px-3 py-2 backdrop-blur max-md:static max-md:col-start-1 max-md:row-start-2 max-md:w-full max-md:px-2 max-md:py-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-secondary-foreground/55">Earth measurements</div>
                <div className="mt-1 flex items-center gap-2 text-xs"><Database className="h-3.5 w-3.5 text-primary" /> Climate + terrain</div>
              </div>
              <div className="absolute bottom-[13%] left-[0%] rounded-sm border border-secondary-foreground/15 bg-secondary/85 px-3 py-2 backdrop-blur max-md:static max-md:col-start-2 max-md:row-start-2 max-md:w-full max-md:px-2 max-md:py-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-secondary-foreground/55">Mission site</div>
                <div className="mt-1 flex items-center gap-2 text-xs"><Globe2 className="h-3.5 w-3.5 text-body-accent" /> {exampleBody === "moon" ? "Moon" : "Mars"} · {exampleRegion}</div>
              </div>
              <div className="absolute left-[12%] top-[19%] h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_hsl(var(--primary)/.15)]" />
              <div className="absolute bottom-[26%] right-[17%] h-1.5 w-1.5 rounded-full bg-secondary-foreground/80" />
            </motion.div>
          </div>
          <div className="relative mx-auto max-w-[1500px] px-5 pb-7 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary-foreground/15 pt-4 font-mono text-[9px] uppercase tracking-[.17em] text-secondary-foreground/50">
              <span>Independent project · NASA Space Apps Challenge 2026</span>
              <span>Not an official NASA product</span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1500px] gap-0 px-5 py-12 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:py-16 lg:px-12" aria-label="How the research tool works">
          <div className="pb-7 md:pb-0 md:pr-10">
            <div className="font-mono text-[10px] uppercase tracking-[.25em] text-primary">From observations to fieldwork</div>
            <h2 className="font-display mt-3 max-w-md text-3xl font-bold leading-tight md:text-4xl">A comparison you can interrogate.</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Not a claim that Earth can reproduce another world. A way to choose what to practise, with the evidence and the gaps visible.</p>
          </div>
          <div className="grid divide-y divide-foreground/10 border-y border-foreground/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            <MethodStep number="01" icon={<Database className="h-4 w-4" />} title="Bring the evidence" body="Measured Earth climate and terrain meet Moon and Mars values processed from planetary data." />
            <MethodStep number="02" icon={<Activity className="h-4 w-4" />} title="Tune the comparison" body="Seven weighted dimensions shape live rankings; adjust mission priorities and inspect the component scores." />
            <MethodStep number="03" icon={<ShieldAlert className="h-4 w-4" />} title="Keep the limits in view" body="Check preliminary grid leads outside the catalogue, then review what a site can rehearse—and what it cannot." />
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-[1500px] flex-wrap justify-between gap-3 px-4 py-6 text-xs md:px-6">
          <span className="max-w-4xl leading-relaxed text-secondary-foreground/65">Built independently for NASA Space Apps Challenge 2026. Earth climate from NASA POWER, terrain from a global DEM, imagery from NASA GIBS. Moon and Mars values come from planetary datasets and model output processed by a rerunnable pipeline; Mars wind uses MCD v6.2 climatology.</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-secondary-foreground/55">Not an official NASA product</span>
        </div>
      </footer>
    </div>
  );
}

function MethodStep({ number, icon, title, body }: { number: string; icon: ReactNode; title: string; body: string }) {
  return (
    <article className="flex gap-3 py-5 md:flex-col md:gap-5 md:px-5 md:py-6 first:md:pl-0 last:md:pr-0" data-testid={`method-step-${number}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-primary">{icon}</div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">{number} / Field method</div>
        <h3 className="font-display mt-1 text-lg font-bold">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </article>
  );
}
