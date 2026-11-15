/**
 * Documented evidence for individual sites, curated from the Terrestrial_Analog_Data pack
 * (processed/evidence-registry.json and processed/status-corrections.json, checked 15 Nov 2026).
 *
 * Rules this file follows (apply them to every country and site):
 * - A documented past mission or study does not show that a facility operates today.
 * - Absence of a programme in this catalogue does not make a site globally novel.
 * - Values tied to the pack's own coordinates are only used here when they describe the same
 *   feature (the LROC pit centres sit within about 2 km of the app's pit coordinates).
 */
import lithologyJson from "./lithology.json";

export interface EvidenceSource {
  publisher: string;
  title: string;
  url: string;
  /** What the source supports, and what it does not */
  supports: string;
}

export interface SiteEvidence {
  /** Documented analog research or missions at or near the site */
  documented?: string;
  /** What is known about current operation; null-like text when it has not been checked */
  currentStatus?: string;
  /** How new the proposed use is, qualified by what is already documented */
  novelty?: string;
  /** Scale, coordinate or interpretation limits of the site's values */
  caveat?: string;
  /** Reference measurements from a cited table (not computed by this app) */
  reference?: { label: string; value: string }[];
  sources: EvidenceSource[];
}

export const LROC_PITS: EvidenceSource = {
  publisher: "LROC, Arizona State University",
  title: "Lunar pit atlas",
  url: "https://www.lroc.asu.edu/atlases/pits/list",
  supports: "Tabulates pit coordinates and size. A surface pit does not prove the extent or conditions of a lava tube below it.",
};

export const SITE_EVIDENCE: Record<string, SiteEvidence> = {
  "earth-ladakh": {
    documented: "ISRO inaugurated the HOPE analog mission setup in Tso Kar Valley on 31 July 2025.",
    currentStatus: "Not checked. A mission in 2025 does not show that the setup operates today.",
    novelty: "Not a new analog setting. The app's point (33.1° N, 78.0° E) has not been checked against the exact HOPE location.",
    sources: [
      {
        publisher: "ISRO",
        title: "Space Analog Mission (HOPE)",
        url: "https://www.isro.gov.in/Space_Analog_Mission.html",
        supports: "A formal analog mission in Tso Kar Valley in 2025. Does not state current operation.",
      },
    ],
  },
  "earth-oman": {
    documented: "NASA-supported research has studied water-rock reactions (serpentinisation) and possible biosignatures in the Samail ophiolite.",
    currentStatus: "No formal crew-training programme is established by the sources checked.",
    novelty: "The broad analog-research setting is already studied. Only the comparison with a specific Moon or Mars target is proposed here.",
    sources: [
      {
        publisher: "NASA Astrobiology",
        title: "Finding life in serpentinite",
        url: "https://astrobiology.nasa.gov/news/finding-life-in-serpentinite/",
        supports: "Prior analog science at Samail. Does not establish a human-training base.",
      },
    ],
  },
  "earth-tibesti": {
    caveat:
      "Volcanic landforms are documented. ESA describes Tarso Tousside as potentially active, so the massif is not described as extinct. No source in this version supports an impact-crater setting, so that tag is not used.",
    novelty: "Known volcanism does not show that the proposed analog use is new.",
    sources: [
      {
        publisher: "NASA Earth Observatory",
        title: "Young and old Tibesti volcanoes",
        url: "https://science.nasa.gov/earth/earth-observatory/young-and-old-tibesti-volcanoes-7457/",
        supports: "Volcanic context. Not an impact-crater match, and not a claim that all volcanoes are extinct.",
      },
      {
        publisher: "ESA",
        title: "Earth from Space: Tarso Tousside, Chad",
        url: "https://www.esa.int/Applications/Observing_the_Earth/Earth_from_Space_Tarso_Tousside_Chad",
        supports: "Describes Tousside, including a potentially active stratovolcano.",
      },
    ],
  },
  "moon-shackleton": {
    caveat:
      "NASA separates the sunlit rim from the permanently shadowed floor. The values here come from the area around the app's point, not a surveyed rim site, so they may not describe the rim's local conditions.",
    sources: [
      {
        publisher: "NASA Science",
        title: "Shackleton crater's illuminated rim, shadowed interior",
        url: "https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/",
        supports: "Rim and floor are different environments; a regional mean cannot stand in for the rim.",
      },
    ],
  },
  "moon-marius": {
    reference: [
      { label: "Pit centre (LROC)", value: "14.0917° N, 56.7701° W" },
      { label: "Funnel diameter", value: "92 × 79 m" },
      { label: "Inner diameter", value: "55 × 49 m" },
      { label: "Depth", value: "40 m" },
    ],
    caveat: "The pit is a surface opening. Its size says nothing certain about a lava tube's length, shape or conditions underground.",
    sources: [LROC_PITS],
  },
  "moon-tranquillitatis": {
    reference: [
      { label: "Pit centre (LROC)", value: "8.3355° N, 33.222° E" },
      { label: "Funnel diameter", value: "146 × 140 m" },
      { label: "Inner diameter", value: "100 × 88 m" },
      { label: "Depth", value: "105 m" },
    ],
    caveat: "The pit is a surface opening. Its size says nothing certain about a lava tube's length, shape or conditions underground.",
    sources: [LROC_PITS],
  },
  "mars-jezero": {
    caveat: "Values describe the area around the app's point, not a mapped outline of the delta deposit.",
    sources: [],
  },
  "mars-gale": {
    caveat: "Values describe the area around the app's point, not a mapped outline of Mount Sharp.",
    sources: [],
  },
  "mars-arsia": {
    caveat: "The point marks the volcano, not a surveyed cave or lava-tube entrance. Values are volcano-scale context.",
    sources: [],
  },
};

/** General rule shown next to every analog status. */
export const STATUS_POLICY =
  "Status is an editorial reading of public sources checked for this version. A documented mission does not prove a facility operates today, and a missing programme here does not make a site new.";

// ---- Regional lithology (GLiM 0.5°) ----

export interface Lithology {
  source: string;
  url: string;
  license: string;
  resolutionDeg: number;
  note: string;
  classes: Record<string, string>;
  sites: Record<string, { lat: number; lon: number; classAtPoint: string | null; block3x3: Record<string, number> }>;
  cells: Record<string, string>;
}

export const LITHOLOGY = lithologyJson as Lithology;

export function lithologyName(code: string | null | undefined): string | null {
  return code ? LITHOLOGY.classes[code] ?? null : null;
}

/** GLiM class at a site's coordinates; null when the site moved since the JSON was built or there is no data. */
export function siteLithology(site: { id: string; lat: number; lon: number }) {
  const rec = LITHOLOGY.sites[site.id];
  if (!rec || rec.lat !== site.lat || rec.lon !== site.lon) return null;
  const nearby = Object.entries(rec.block3x3)
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => ({ name: lithologyName(code) ?? code, n }));
  return { atPoint: lithologyName(rec.classAtPoint), nearby };
}

export function cellLithology(cell: { lat: number; lon: number }): string | null {
  return lithologyName(LITHOLOGY.cells[`${cell.lat},${cell.lon}`]);
}
