import { useState } from "react";
import "./_group.css";
import "./guidedjourney.css";

type Body = "moon" | "mars";

const steps = [
  { number: "01", title: "Choose a world", caption: "Moon or Mars" },
  { number: "02", title: "Set priorities", caption: "What matters most?" },
  { number: "03", title: "See your matches", caption: "Earth sites to explore" },
];

const priorities = [
  { id: "terrain", title: "Rugged terrain", detail: "Slopes, elevation & surface texture", icon: "⌁" },
  { id: "temperature", title: "Temperature range", detail: "Daily swings and seasonal extremes", icon: "◒" },
  { id: "light", title: "Light & shadow", detail: "Sun angle, darkness and exposure", icon: "◐" },
  { id: "isolation", title: "Remote operations", detail: "Distance, access and field logistics", icon: "⌖" },
];

function PlanetMark({ body }: { body: Body }) {
  return (
    <svg className={`gj-planet gj-planet-${body}`} viewBox="0 0 150 150" aria-hidden="true">
      <circle cx="75" cy="75" r="63" fill="currentColor" opacity=".13" />
      <circle cx="75" cy="75" r="48" fill="currentColor" opacity=".22" />
      {body === "moon" ? (
        <>
          <circle cx="75" cy="75" r="38" fill="#c5c8c1" />
          <circle cx="55" cy="61" r="8" fill="#9ea39f" opacity=".75" />
          <circle cx="91" cy="50" r="5" fill="#a5aaa5" />
          <circle cx="96" cy="83" r="12" fill="#a2a7a2" />
          <circle cx="63" cy="96" r="6" fill="#9ca29d" />
          <path d="M39 71c20-23 50-28 72-11" fill="none" stroke="#e7e7df" strokeWidth="2" opacity=".8" />
        </>
      ) : (
        <>
          <circle cx="75" cy="75" r="38" fill="#c87558" />
          <path d="M41 64c16 8 35 7 66-7M44 87c20-10 38-8 62 1M67 39c-5 18 0 31 15 45" fill="none" stroke="#a95542" strokeWidth="5" opacity=".72" />
          <circle cx="97" cy="57" r="8" fill="#de9874" opacity=".75" />
          <path d="M51 46c15-12 36-13 51-3" fill="none" stroke="#f0b393" strokeWidth="3" opacity=".7" />
        </>
      )}
      <circle cx="75" cy="75" r="48" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
    </svg>
  );
}

export function GuidedJourney() {
  const [step, setStep] = useState(1);
  const [body, setBody] = useState<Body>("moon");
  const [region, setRegion] = useState("Shackleton Crater");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(["terrain", "temperature"]);
  const [submitted, setSubmitted] = useState(false);

  const regions = body === "moon"
    ? ["Shackleton Crater", "Lunar South Pole", "Marius Hills"]
    : ["Jezero Crater", "Gale Crater", "Valles Marineris"];

  const changeBody = (nextBody: Body) => {
    setBody(nextBody);
    setRegion(nextBody === "moon" ? "Shackleton Crater" : "Jezero Crater");
  };

  const togglePriority = (id: string) => {
    setSelectedPriorities((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const next = () => {
    if (step < 3) setStep((current) => current + 1);
    else setSubmitted(true);
  };

  const restart = () => {
    setStep(1);
    setSubmitted(false);
  };

  return (
    <div className="gj-shell" data-body={body}>
      <header className="gj-header">
        <div className="gj-brand">
          <div className="gj-mark"><span /></div>
          <div>
            <div className="gj-brand-name">Terrestrial Analog Finder</div>
            <div className="gj-brand-caption">MOON & MARS REHEARSAL PLANNER</div>
          </div>
        </div>
        <div className="gj-header-right">
          <span className="gj-method-dot" />
          <span>STATIC DESIGN PREVIEW · NOT LIVE DATA</span>
          <button className="gj-method" type="button" onClick={() => window.alert("This is a static design preview. A future live comparison would use NASA POWER climate and terrain data alongside processed Moon and Mars surface values.")}>
            Data & method <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <main className="gj-main">
        <div className="gj-intro">
          <div>
            <div className="gj-eyebrow"><span>FIELD PLANNING / 01</span><i /> A GOOD REHEARSAL STARTS HERE</div>
            <h1>We cannot go yet.<br /><span>Let’s choose where</span> to practice.</h1>
            <p>Static design preview — not connected to live data. Explore a sample journey for choosing an Earth rehearsal site.</p>
          </div>
          <div className="gj-orbit-art" aria-hidden="true">
            <span className="gj-orbit gj-orbit-one" /><span className="gj-orbit gj-orbit-two" />
            <span className="gj-orbit-sun" /><span className="gj-orbit-planet" />
            <span className="gj-orbit-label">EARTH / FIELD ANALOGS</span>
          </div>
        </div>

        <div className="gj-progress-track" aria-label={`Step ${step} of 3`}>
          {steps.map((item, index) => (
            <div className={`gj-progress-item ${step === index + 1 ? "is-current" : ""} ${step > index + 1 ? "is-done" : ""}`} key={item.number}>
              <span className="gj-progress-number">{step > index + 1 ? "✓" : item.number}</span>
              <div><strong>{item.title}</strong><small>{item.caption}</small></div>
              {index < steps.length - 1 && <span className="gj-progress-line" />}
            </div>
          ))}
        </div>

        <section className="gj-workspace">
          <aside className="gj-side-note">
            <div className="gj-side-kicker">YOUR FIELD BRIEF</div>
            <div className="gj-brief-rule" />
            <div className="gj-brief-row"><span>Destination</span><strong>{body === "moon" ? "The Moon" : "Mars"}</strong></div>
            <div className="gj-brief-row"><span>Study area</span><strong>{region}</strong></div>
            <div className="gj-brief-row"><span>Priorities</span><strong>{selectedPriorities.length ? `${selectedPriorities.length} selected` : "Not set"}</strong></div>
            <div className="gj-side-foot">
              <div className="gj-compass">N</div>
              <p>One clear decision at a time.<br /><em>There are no wrong starting points.</em></p>
            </div>
          </aside>

          <div className="gj-content-panel">
            {step === 1 && (
              <div className="gj-step-content">
                <div className="gj-panel-heading">
                  <div><span className="gj-step-label">STEP 01 / DESTINATION</span><h2>Which world are you preparing for?</h2></div>
                  <span className="gj-step-count">01 <i>/</i> 03</span>
                </div>
                <p className="gj-panel-copy">Start with the place your crew is working toward. You can change this later.</p>

                <div className="gj-world-grid">
                  <button type="button" className={`gj-world-card ${body === "moon" ? "is-selected" : ""}`} onClick={() => changeBody("moon")} aria-pressed={body === "moon"}>
                    <span className="gj-world-top"><span className="gj-radio" /><span className="gj-world-code">01 / LUNA</span></span>
                    <PlanetMark body="moon" />
                    <span className="gj-world-name">The Moon</span>
                    <span className="gj-world-description">Cold shadows. Long nights. Familiar ground, utterly changed.</span>
                    <span className="gj-world-meta"><b>384,400 km</b><i /> SOUTH POLE FOCUS</span>
                  </button>
                  <button type="button" className={`gj-world-card ${body === "mars" ? "is-selected" : ""}`} onClick={() => changeBody("mars")} aria-pressed={body === "mars"}>
                    <span className="gj-world-top"><span className="gj-radio" /><span className="gj-world-code">02 / ARES</span></span>
                    <PlanetMark body="mars" />
                    <span className="gj-world-name">Mars</span>
                    <span className="gj-world-description">Thin air. Dust in the wind. A landscape that keeps its secrets.</span>
                    <span className="gj-world-meta"><b>225 million km</b><i /> JEZERO / GALE</span>
                  </button>
                </div>

                <label className="gj-region-label" htmlFor="gj-region">PICK A STUDY AREA <span>Specific location makes your comparison more useful.</span></label>
                <select id="gj-region" className="gj-region-select" value={region} onChange={(event) => setRegion(event.target.value)}>
                  {regions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            )}

            {step === 2 && (
              <div className="gj-step-content">
                <div className="gj-panel-heading">
                  <div><span className="gj-step-label">STEP 02 / FIELD CONDITIONS</span><h2>What should the site help you practice?</h2></div>
                  <span className="gj-step-count">02 <i>/</i> 03</span>
                </div>
                <p className="gj-panel-copy">Choose conditions to shape this example brief. Selecting priorities does not calculate or update live matches.</p>
                <div className="gj-priority-list">
                  {priorities.map((item, index) => (
                    <button type="button" key={item.id} className={`gj-priority ${selectedPriorities.includes(item.id) ? "is-selected" : ""}`} onClick={() => togglePriority(item.id)} aria-pressed={selectedPriorities.includes(item.id)}>
                      <span className="gj-priority-index">0{index + 1}</span><span className="gj-priority-icon">{item.icon}</span>
                      <span className="gj-priority-text"><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <span className="gj-check">{selectedPriorities.includes(item.id) ? "✓" : "+"}</span>
                    </button>
                  ))}
                </div>
                <div className="gj-note-strip"><span>STATIC PREVIEW</span> These selections are for the design demo only; they do not affect or calculate live matches.</div>
              </div>
            )}

            {step === 3 && (
              <div className="gj-step-content">
                {!submitted ? (
                  <>
                    <div className="gj-panel-heading">
                      <div><span className="gj-step-label">STEP 03 / REVIEW</span><h2>Your field brief is ready.</h2></div>
                      <span className="gj-step-count">03 <i>/</i> 03</span>
                    </div>
                    <p className="gj-panel-copy">We’ll compare the destination’s conditions against measured Earth field sites.</p>
                    <div className="gj-review-card">
                      <div className="gj-review-planet"><PlanetMark body={body} /></div>
                      <div className="gj-review-main"><span className="gj-step-label">DESTINATION / {body === "moon" ? "LUNA" : "ARES"}</span><h3>{region}</h3><p>{body === "moon" ? "The Moon" : "Mars"} · {selectedPriorities.length} mission {selectedPriorities.length === 1 ? "priority" : "priorities"} weighted</p></div>
                      <button type="button" className="gj-edit-btn" onClick={() => setStep(1)}>Edit</button>
                    </div>
                    <div className="gj-review-priorities"><span>YOUR CONDITIONS</span><div>{priorities.filter((item) => selectedPriorities.includes(item.id)).map((item) => <b key={item.id}>{item.title}</b>)}</div></div>
                    <div className="gj-method-callout"><span className="gj-method-symbol">↗</span><p><strong>Measured, not imagined.</strong><br />21 Earth sites ranked on climate and terrain indicators. Values are matched against NASA surface datasets.</p></div>
                  </>
                ) : (
                  <div className="gj-results">
                    <div className="gj-result-kicker">YOUR FIRST FIELD MATCHES / {body === "moon" ? "LUNA" : "ARES"}</div>
                    <h2>Start your rehearsal<br />on Earth.</h2>
                    <p className="gj-results-intro">Illustrative examples for {region}. Priority selections do not change these sample results.</p>
                    {[
                      { rank: "01", name: "McMurdo Dry Valleys", place: "Antarctica · Polar desert", score: body === "moon" ? "51.3" : "48.6", note: "Cold, exposed terrain" },
                      { rank: "02", name: "Haughton Crater", place: "Nunavut · Impact structure", score: "45.8", note: "Remote field operations" },
                      { rank: "03", name: "Meteora Plateau", place: "Greece · Rocky highlands", score: "37.9", note: "Rugged surface analog" },
                    ].map((result) => (
                      <div className="gj-result-row" key={result.rank}><span className="gj-result-rank">{result.rank}</span><div><strong>{result.name}</strong><small>{result.place}</small></div><span className="gj-result-note">{result.note}</span><span className="gj-result-score">{result.score}<small> MATCH</small></span></div>
                    ))}
                    <p className="gj-demo-disclaimer">Illustrative preview · Matches shown are not live calculations.</p>
                    <button type="button" className="gj-text-action" onClick={restart}>← Start a new field brief</button>
                  </div>
                )}
              </div>
            )}

            {!submitted && <div className="gj-panel-footer">
              <button type="button" className="gj-back-button" onClick={() => step > 1 ? setStep((current) => current - 1) : restart()} disabled={step === 1}>← <span>Back</span></button>
              <div className="gj-footer-hint">{step === 1 ? "Usually takes less than a minute" : step === 2 ? `${selectedPriorities.length} condition${selectedPriorities.length === 1 ? "" : "s"} selected` : "You can adjust your choices at any time"}</div>
              <button type="button" className="gj-next-button" onClick={next} disabled={step === 2 && selectedPriorities.length === 0}>
                {step === 3 ? "Find my field matches" : "Continue"} <span aria-hidden="true">→</span>
              </button>
            </div>}
          </div>
        </section>
        <footer className="gj-footer"><span>TERRESTRIAL ANALOG FINDER</span><span>NASA POWER · SURFACE DATASETS · FIELD SITES</span><span>01—03</span></footer>
      </main>
    </div>
  );
}

export default GuidedJourney;
