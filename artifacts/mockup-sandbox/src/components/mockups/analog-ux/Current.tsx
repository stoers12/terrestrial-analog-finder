import { useMemo, useState } from "react";
import { Check, ChevronDown, CircleHelp, Info, MapPin } from "lucide-react";
import "./_group.css";
import "./Current.css";
import { EARTH_SEEDS, TARGET_SEEDS, hydrateTargetSite, type TargetApiSite } from "./_source/data/sites";
import targets from "./_source/targets.json";

type World = "moon" | "mars";

const targetSites = TARGET_SEEDS.map((seed) =>
  hydrateTargetSite(seed, targets.sites.find((site) => site.id === seed.id) as TargetApiSite),
);

const SAMPLE_RESULTS = [
  { id: "earth-drivalleys", score: 51.3, name: "McMurdo Dry Valleys", region: "Antarctica", note: "Strong on isolation and sunlight geometry" },
  { id: "earth-haughton", score: 45.8, name: "Haughton Crater", region: "Devon Island, Canada", note: "A useful established impact-crater field site" },
  { id: "earth-meteor", score: 37.9, name: "Meteor Crater", region: "Arizona, USA", note: "A lower overall match in this example" },
  { id: "earth-tibesti", score: 37.9, name: "Tibesti volcanic massif", region: "Chad", note: "A lower overall match in this example" },
] as const;

const topSite = EARTH_SEEDS.find((site) => site.id === SAMPLE_RESULTS[0].id);

function MiniMark() {
  return (
    <span className="ux-mark" aria-hidden="true">
      <span />
    </span>
  );
}

export function Current() {
  const [world, setWorld] = useState<World>("moon");
  const visibleTargets = useMemo(() => targetSites.filter((site) => site.body === world), [world]);
  const [targetId, setTargetId] = useState("moon-shackleton");
  const target = targetSites.find((site) => site.id === targetId) ?? targetSites[0];
  const [showMethod, setShowMethod] = useState(false);

  const chooseWorld = (nextWorld: World) => {
    setWorld(nextWorld);
    setTargetId(nextWorld === "moon" ? "moon-shackleton" : "mars-jezero");
  };

  return (
    <div className="ux-page" data-body={world}>
      <header className="ux-header">
        <a className="ux-brand" href="#start" aria-label="Terrestrial Analog Finder home">
          <MiniMark />
          <span>
            <strong>Terrestrial Analog Finder</strong>
            <small>Moon & Mars field rehearsals</small>
          </span>
        </a>
        <span className="ux-preview-tag">Design preview · sample data</span>
        <button className="ux-method-button" type="button" onClick={() => setShowMethod((open) => !open)} aria-expanded={showMethod}>
          <CircleHelp size={16} aria-hidden="true" />
          <span>How to use this</span>
        </button>
      </header>

      <main id="start" className="ux-main">
        <section className="ux-intro" aria-labelledby="page-title">
          <div className="ux-intro-copy">
            <p className="ux-eyebrow"><span>FIELD PLANNING</span><i /> ONE CLEAR DECISION AT A TIME</p>
            <h1 id="page-title">Find a place on Earth<br className="ux-desktop-break" /> to rehearse for <em>{world === "moon" ? "the Moon." : "Mars."}</em></h1>
            <p className="ux-lede">Choose a mission destination. We’ll show Earth locations with similar conditions—and explain where the match falls short.</p>
          </div>
          <ol className="ux-steps" aria-label="Three simple steps">
            <li className="is-current"><span>01</span><div><strong>Choose a destination</strong><small>Moon or Mars</small></div></li>
            <li><span>02</span><div><strong>Compare Earth sites</strong><small>See the closest matches</small></div></li>
            <li><span>03</span><div><strong>Plan your rehearsal</strong><small>Know what to test</small></div></li>
          </ol>
        </section>

        {showMethod && (
          <aside className="ux-how-panel" id="how-it-works">
            <Info size={17} aria-hidden="true" />
            <div>
              <strong>What does “similar” mean?</strong>
              <p>Each Earth site gets a 0–100 similarity score based on the selected Moon or Mars location. The score helps compare environments; it is not a safety rating or proof that two places are the same.</p>
            </div>
            <button type="button" aria-label="Close explanation" onClick={() => setShowMethod(false)}>×</button>
          </aside>
        )}

        <section className="ux-workspace" aria-label="Choose a destination and understand the example">
          <div className="ux-choice">
            <div className="ux-section-heading">
              <div className="ux-number">01</div>
              <div>
                <h2>Where is your mission going?</h2>
                <p>Start with a named landing or base area.</p>
              </div>
            </div>

            <div className="ux-world-picker" role="group" aria-label="Choose a world">
              <button type="button" className={`ux-world-option ${world === "moon" ? "is-selected" : ""}`} onClick={() => chooseWorld("moon")} aria-pressed={world === "moon"}>
                <span className="ux-world-icon ux-moon-icon" aria-hidden="true"><span /></span>
                <span className="ux-world-text"><strong>The Moon</strong><small>Low gravity · no atmosphere</small></span>
                <span className="ux-radio">{world === "moon" && <Check size={13} aria-hidden="true" />}</span>
              </button>
              <button type="button" className={`ux-world-option ${world === "mars" ? "is-selected" : ""}`} onClick={() => chooseWorld("mars")} aria-pressed={world === "mars"}>
                <span className="ux-world-icon ux-mars-icon" aria-hidden="true"><span /></span>
                <span className="ux-world-text"><strong>Mars</strong><small>Thin air · dusty terrain</small></span>
                <span className="ux-radio">{world === "mars" && <Check size={13} aria-hidden="true" />}</span>
              </button>
            </div>

            <label className="ux-select-label" htmlFor="target-select">Choose a specific site</label>
            <div className="ux-select-wrap">
              <MapPin size={16} aria-hidden="true" />
              <select id="target-select" value={target.id} onChange={(event) => setTargetId(event.target.value)} aria-describedby="target-help">
                {visibleTargets.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
            <p id="target-help" className="ux-help">Not sure yet? Start with Shackleton Crater or Jezero Crater delta.</p>
            <div className="ux-picked-site">
              <span className="ux-picked-label">Selected destination</span>
              <strong>{target.name}</strong>
              <span>{target.region} <i /> {target.lat.toFixed(1)}° {target.lat < 0 ? "S" : "N"}</span>
            </div>
          </div>

          <section className="ux-example" aria-labelledby="example-title">
            <div className="ux-example-top">
              <span className="ux-example-label"><span className="ux-live-dot" /> REAL APP EXAMPLE</span>
              <span className="ux-example-target">Shackleton Crater rim · Moon</span>
            </div>
            <div className="ux-score-row">
              <div>
                <p className="ux-eyebrow ux-eyebrow-small">CLOSEST MATCH IN THIS EXAMPLE</p>
                <h2 id="example-title">{topSite?.name ?? "McMurdo Dry Valleys"}</h2>
                <p className="ux-location">{topSite?.region ?? "Antarctica"}</p>
              </div>
              <div className="ux-score" aria-label="Similarity score 51.3 out of 100">
                <strong>51.3</strong>
                <span>out of 100</span>
              </div>
            </div>
            <div className="ux-score-track" aria-hidden="true"><span /></div>
            <div className="ux-score-meaning">
              <span className="ux-score-badge">WEAK MATCH</span>
              <p>A useful rehearsal for <strong>isolation and sunlight</strong>—but not for the Moon’s extreme cold.</p>
            </div>
            <div className="ux-explanation">
              <p className="ux-explanation-title">Why it ranks first</p>
              <div className="ux-dimension-row"><span>Isolation</span><div><i style={{ width: "100%" }} /></div><strong>100</strong></div>
              <div className="ux-dimension-row"><span>Sun geometry</span><div><i style={{ width: "86%" }} /></div><strong>86</strong></div>
              <div className="ux-dimension-row ux-dimension-gap"><span>Temperature</span><div><i style={{ width: "4%" }} /></div><strong>0</strong></div>
            </div>
            <div className="ux-limitation">
              <Info size={17} aria-hidden="true" />
              <p><strong>A match is not a twin.</strong> Scores compare seven conditions. They help find a rehearsal site, but don’t mean the environments are identical or mission-safe.</p>
            </div>
          </section>
        </section>

        <section className="ux-rankings" aria-labelledby="ranking-title">
          <div className="ux-ranking-heading">
            <div className="ux-number">02</div>
            <div><h2 id="ranking-title">Other places to compare</h2><p>These are the next highest-scoring sites in the same Shackleton example.</p></div>
            <button type="button" className="ux-ranking-help" onClick={() => setShowMethod((open) => !open)} aria-label="Explain ranking scores"><CircleHelp size={17} /></button>
          </div>
          <div className="ux-result-list">
            {SAMPLE_RESULTS.slice(1).map((site, index) => (
              <article className="ux-result-row" key={site.id}>
                <span className="ux-result-rank">{String(index + 2).padStart(2, "0")}</span>
                <span className="ux-result-pin"><MapPin size={15} aria-hidden="true" /></span>
                <span className="ux-result-name"><strong>{site.name}</strong><small>{site.region}</small></span>
                <span className="ux-result-note">{site.note}</span>
                <span className="ux-result-score">{site.score.toFixed(1)}<small> / 100</small></span>
              </article>
            ))}
          </div>
          <p className="ux-preview-disclosure"><Info size={14} aria-hidden="true" /> Design preview: the selector is interactive. The scores and rankings shown are fixed real-app examples for Shackleton Crater, not recalculated for another selection.</p>
        </section>

        <footer className="ux-footer">
          <span>Terrestrial Analog Finder</span>
          <span>Earth locations for Moon & Mars field rehearsal</span>
          <span>NASA sources · processed planetary data</span>
        </footer>
      </main>
    </div>
  );
}
