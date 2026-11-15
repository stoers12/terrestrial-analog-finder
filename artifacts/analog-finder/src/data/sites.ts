/**
 * Site catalogue for the Terrestrial Analog Finder.
 *
 * Only editorial fields live here: names, geology tags, isolation, summaries, missions, status.
 *
 * Moon and Mars numbers (temperature, elevation, relief, pressure, wind) are produced by the
 * NASA data pipeline (artifacts/api-server/src/pipeline), served by GET /api/targets and merged
 * in by hydrateTargetSite().
 *
 * Earth numbers are measured at load time from NASA POWER and a global DEM by the API server
 * and merged in by hydrateEarthSite().
 */

export type Body = "moon" | "mars" | "earth";

export type GeologyTag =
  | "basalt-volcanic"
  | "impact-crater"
  | "evaporite-salts"
  | "fine-regolith-dust"
  | "permafrost-ice"
  | "lava-tubes"
  | "clay-sulfate"
  | "ancient-crystalline"
  | "sand-dunes"
  | "glacial-periglacial";

export const GEOLOGY_LABELS: Record<GeologyTag, string> = {
  "basalt-volcanic": "Basaltic volcanism",
  "impact-crater": "Impact crater",
  "evaporite-salts": "Evaporites and salts",
  "fine-regolith-dust": "Fine regolith and dust",
  "permafrost-ice": "Ground ice and permafrost",
  "lava-tubes": "Lava tubes and caves",
  "clay-sulfate": "Clays and sulfates",
  "ancient-crystalline": "Ancient crystalline rock",
  "sand-dunes": "Dunes and wind-sculpted terrain",
  "glacial-periglacial": "Glacial and periglacial ground",
};

export type AnalogStatus = "established" | "emerging" | "proposed";

/** Provenance of the measured values on an Earth site. */
export interface Measured {
  elevationM: number;
  reliefM: number;
  climateSource: string;
  elevationSource: string;
  fetchedAt: string;
}

export type ValueKind = "raw-derived" | "derived" | "reference";

export type TargetVariable = "meanTempC" | "minTempC" | "maxTempC" | "elevationM" | "reliefM" | "pressureKpa" | "windMs";

/** Provenance of one Moon or Mars value, as stored by the pipeline. */
export interface TargetValueInfo {
  value: number;
  kind: ValueKind;
  product: string;
  sourceUrl: string;
  processedAt: string;
  pixelSize: string;
  cleaningNote: string;
  samples: number | null;
}

/** Moon/Mars sites: the pipeline values and where each one came from. */
export interface TargetData {
  elevationM: number;
  reliefM: number;
  values: Record<TargetVariable, TargetValueInfo>;
}

export interface Site {
  id: string;
  name: string;
  body: Body;
  region: string;
  lat: number;
  lon: number;
  /** Annual mean surface (skin) temperature, degrees C */
  meanTempC: number;
  /** Coldest surface temperature, degrees C. Earth: coldest month's mean daily minimum. Moon/Mars: mean of the coldest 10% of night samples. */
  minTempC: number;
  /** Annual precipitation, mm (0 off-Earth) */
  precipMm: number;
  /** Surface atmospheric pressure, kPa (0 on the Moon, about 0.6 on Mars) */
  pressureKpa: number;
  /** Near-surface wind speed, m/s; MCD model climatology on Mars, zero on the Moon */
  windMs: number;
  geology: GeologyTag[];
  /** Relief / slope difficulty, 0 (flat plain) to 10 (steep, broken terrain) */
  ruggedness: number;
  /** Distance from infrastructure and people, 0 (roadside) to 10 (nowhere) */
  isolation: number;
  /** Earth sites only: how the site is regarded as an analog today */
  status?: AnalogStatus;
  /** Earth sites only: where the measured values came from */
  measured?: Measured;
  /** Moon/Mars sites only: pipeline values with provenance */
  targetData?: TargetData;
  /** One or two sentences on why the site matters */
  summary: string;
  /** Moon/Mars sites: what a base or landing there is for */
  mission?: string;
}

/** Editorial fields of a Moon or Mars target. Every number comes from the pipeline. */
export interface TargetSeed {
  id: string;
  name: string;
  body: "moon" | "mars";
  region: string;
  geology: GeologyTag[];
  /** Editorial estimate, 0 (roadside) to 10 (nowhere). Not measured. */
  isolation: number;
  summary: string;
  mission: string;
}

export const TARGET_SEEDS: TargetSeed[] = [
  // ---- Moon ----
  {
    id: "moon-shackleton",
    name: "Shackleton Crater rim",
    body: "moon",
    region: "South pole",
    geology: ["impact-crater", "fine-regolith-dust", "permafrost-ice"],
    isolation: 10,
    summary:
      "A 21 km crater at the pole whose rim sees near-continuous sunlight while the floor is in permanent shadow and holds water ice.",
    mission: "Candidate Artemis base camp area with sunlight for power and ice for propellant and water.",
  },
  {
    id: "moon-malapert",
    name: "Malapert Massif",
    body: "moon",
    region: "South pole region",
    geology: ["ancient-crystalline", "fine-regolith-dust", "impact-crater"],
    isolation: 10,
    summary:
      "A 5 km high massif near the south pole with long illumination and a permanent line of sight to Earth.",
    mission: "Relay and base site: continuous Earth view for communications plus high sun for power.",
  },
  {
    id: "moon-marius",
    name: "Marius Hills pit",
    body: "moon",
    region: "Oceanus Procellarum",
    geology: ["basalt-volcanic", "lava-tubes", "fine-regolith-dust"],
    isolation: 10,
    summary:
      "A collapse pit in a volcanic dome field that opens into a lava tube, with gravity data pointing to a larger cave below.",
    mission: "Cave habitat concept: a ready-made shelter from radiation, micrometeorites and temperature swings.",
  },
  {
    id: "moon-tranquillitatis",
    name: "Mare Tranquillitatis pit",
    body: "moon",
    region: "Sea of Tranquility",
    geology: ["basalt-volcanic", "lava-tubes", "fine-regolith-dust"],
    isolation: 10,
    summary:
      "The deepest known lunar pit, about 100 m, on a flat basalt plain with radar evidence of a sublunar cave.",
    mission: "Low-risk equatorial landing next to a cave entrance for exploration.",
  },
  {
    id: "moon-schrodinger",
    name: "Schrodinger Basin",
    body: "moon",
    region: "Far side, south polar",
    geology: ["impact-crater", "basalt-volcanic", "fine-regolith-dust"],
    isolation: 10,
    summary:
      "A young 320 km peak-ring basin on the far side with exposed deep crust and volcanic vents.",
    mission: "Science outpost for deep-crust geology and quiet radio astronomy.",
  },

  // ---- Mars ----
  {
    id: "mars-jezero",
    name: "Jezero Crater delta",
    body: "mars",
    region: "Isidis Planitia rim",
    geology: ["clay-sulfate", "impact-crater", "basalt-volcanic", "sand-dunes"],
    isolation: 10,
    summary:
      "An ancient lake basin with a well-preserved river delta, carbonates and clays. Perseverance has been sampling it since 2021.",
    mission: "Astrobiology site: sedimentary rocks that could preserve signs of past life.",
  },
  {
    id: "mars-gale",
    name: "Gale Crater, Mount Sharp",
    body: "mars",
    region: "Aeolis Mons",
    geology: ["impact-crater", "clay-sulfate", "sand-dunes"],
    isolation: 10,
    summary:
      "A 154 km crater with a 5 km layered mound recording the drying of Mars. Curiosity has climbed it since 2012.",
    mission: "Habitability record: layered clays that shift to sulfates as the climate dried.",
  },
  {
    id: "mars-oxia",
    name: "Oxia Planum",
    body: "mars",
    region: "Chryse region",
    geology: ["clay-sulfate", "basalt-volcanic"],
    isolation: 10,
    summary:
      "A flat plain covered in iron-magnesium clays, selected as the landing site for ESA's Rosalind Franklin rover.",
    mission: "Low-slope landing zone over some of the oldest exposed clay deposits.",
  },
  {
    id: "mars-arcadia",
    name: "Arcadia Planitia",
    body: "mars",
    region: "Northern lowlands",
    geology: ["permafrost-ice", "fine-regolith-dust"],
    isolation: 10,
    summary:
      "A smooth mid-latitude plain with shallow ice buried under a few tens of centimetres of dust.",
    mission: "Candidate crewed landing site: reachable ice for water and fuel on easy terrain.",
  },
  {
    id: "mars-arsia",
    name: "Arsia Mons lava tubes",
    body: "mars",
    region: "Tharsis volcanic province",
    geology: ["basalt-volcanic", "lava-tubes"],
    isolation: 10,
    summary:
      "A giant shield volcano whose flanks hold skylights that open into lava tubes, a likely shelter from radiation.",
    mission: "Subsurface habitat concept shielded from radiation and dust storms.",
  },
  {
    id: "mars-mawrth",
    name: "Mawrth Vallis",
    body: "mars",
    region: "Arabia Terra",
    geology: ["clay-sulfate", "basalt-volcanic", "ancient-crystalline"],
    isolation: 10,
    summary:
      "An outflow channel cutting through a thick stack of layered clays, among the most diverse in the solar system.",
    mission: "A long, readable record of early Mars water chemistry in a single cross-section.",
  },
];

export interface EarthSeed {
  id: string;
  name: string;
  body: "earth";
  region: string;
  lat: number;
  lon: number;
  geology: GeologyTag[];
  /** Editorial estimate, 0 (roadside) to 10 (nowhere). Not measured. */
  isolation: number;
  status: AnalogStatus;
  summary: string;
}

export const EARTH_SEEDS: EarthSeed[] = [
  {
    id: "earth-atacama",
    name: "Atacama Desert, Yungay",
    body: "earth",
    region: "Chile",
    lat: -24.1,
    lon: -69.9,
    geology: ["evaporite-salts", "fine-regolith-dust", "clay-sulfate"],
    isolation: 8,
    status: "established",
    summary: "The driest non-polar place on Earth, with perchlorate-bearing soils that resemble Martian regolith.",
  },
  {
    id: "earth-haughton",
    name: "Haughton Crater, Devon Island",
    body: "earth",
    region: "Nunavut, Canada",
    lat: 75.4,
    lon: -89.7,
    geology: ["impact-crater", "permafrost-ice", "glacial-periglacial"],
    isolation: 10,
    status: "established",
    summary: "A 23 million year old impact crater in a polar desert, home to the Haughton-Mars Project.",
  },
  {
    id: "earth-deathvalley",
    name: "Death Valley",
    body: "earth",
    region: "California, USA",
    lat: 36.5,
    lon: -117.1,
    geology: ["evaporite-salts", "sand-dunes", "fine-regolith-dust"],
    isolation: 4,
    status: "established",
    summary: "Salt flats, alluvial fans and dunes used for rover tests and Mars field geology.",
  },
  {
    id: "earth-kilauea",
    name: "Kilauea and Mauna Ulu",
    body: "earth",
    region: "Hawaii, USA",
    lat: 19.4,
    lon: -155.3,
    geology: ["basalt-volcanic", "lava-tubes", "fine-regolith-dust"],
    isolation: 3,
    status: "established",
    summary: "Fresh basalt flows and lava tubes used for lunar regolith simulants and resource-extraction trials.",
  },
  {
    id: "earth-drivalleys",
    name: "McMurdo Dry Valleys",
    body: "earth",
    region: "Antarctica",
    lat: -77.5,
    lon: 162.5,
    geology: ["permafrost-ice", "glacial-periglacial", "ancient-crystalline", "fine-regolith-dust", "evaporite-salts"],
    isolation: 10,
    status: "established",
    summary: "The coldest, driest desert on Earth: ice-cemented ground and salt-rich soils close to Mars mid-latitudes.",
  },
  {
    id: "earth-riotinto",
    name: "Rio Tinto",
    body: "earth",
    region: "Andalusia, Spain",
    lat: 37.7,
    lon: -6.55,
    geology: ["clay-sulfate"],
    isolation: 3,
    status: "established",
    summary: "An acidic river rich in iron and sulfates with life in extreme chemistry, used for Mars drilling tests.",
  },
  {
    id: "earth-askja",
    name: "Askja caldera",
    body: "earth",
    region: "Highlands, Iceland",
    lat: 65,
    lon: -16.75,
    geology: ["basalt-volcanic", "glacial-periglacial", "fine-regolith-dust"],
    isolation: 8,
    status: "established",
    summary: "Barren basalt and ash where Apollo crews trained and where Mars-style volcano-ice interactions are studied.",
  },
  {
    id: "earth-meteor",
    name: "Meteor Crater",
    body: "earth",
    region: "Arizona, USA",
    lat: 35.03,
    lon: -111.02,
    geology: ["impact-crater", "fine-regolith-dust"],
    isolation: 3,
    status: "established",
    summary: "The best-preserved young impact crater on Earth, used for Apollo astronaut geology training.",
  },
  {
    id: "earth-teide",
    name: "Las Canadas del Teide",
    body: "earth",
    region: "Tenerife, Spain",
    lat: 28.27,
    lon: -16.64,
    geology: ["basalt-volcanic", "fine-regolith-dust", "lava-tubes"],
    isolation: 4,
    status: "established",
    summary: "A high-altitude volcanic caldera with thin air and barren pumice plains used for Mars rover field tests.",
  },
  {
    id: "earth-craters-moon",
    name: "Craters of the Moon",
    body: "earth",
    region: "Idaho, USA",
    lat: 43.4,
    lon: -113.5,
    geology: ["basalt-volcanic", "lava-tubes", "fine-regolith-dust"],
    isolation: 6,
    status: "emerging",
    summary: "A vast young basalt field with open lava tubes, where Apollo astronauts practised cave and lava-field geology.",
  },
  {
    id: "earth-svalbard",
    name: "Bockfjorden volcanic complex",
    body: "earth",
    region: "Svalbard, Norway",
    lat: 79.4,
    lon: 13.5,
    geology: ["permafrost-ice", "glacial-periglacial", "basalt-volcanic", "clay-sulfate"],
    isolation: 9,
    status: "emerging",
    summary: "Volcanic vents, carbonates and permafrost used by the AMASE Mars science campaigns.",
  },
  {
    id: "earth-uyuni",
    name: "Salar de Uyuni",
    body: "earth",
    region: "Bolivia",
    lat: -20.2,
    lon: -67.5,
    geology: ["evaporite-salts", "fine-regolith-dust"],
    isolation: 6,
    status: "emerging",
    summary: "The world's largest salt flat at 3,650 m: a dead-flat, thin-air surface for rover navigation tests.",
  },
  {
    id: "earth-danakil",
    name: "Dallol and the Danakil Depression",
    body: "earth",
    region: "Afar, Ethiopia",
    lat: 14.24,
    lon: 40.3,
    geology: ["evaporite-salts", "basalt-volcanic", "clay-sulfate"],
    isolation: 8,
    status: "emerging",
    summary: "Hot, acidic brine pools and sulfur deposits that bound the limits of life, a model for Martian salt lakes.",
  },
  {
    id: "earth-pinacate",
    name: "El Pinacate volcanic field",
    body: "earth",
    region: "Sonora, Mexico",
    lat: 31.9,
    lon: -113.5,
    geology: ["basalt-volcanic", "sand-dunes"],
    isolation: 7,
    status: "emerging",
    summary: "Dark lava and maar craters next to active dunes, another Apollo training ground.",
  },
  {
    id: "earth-qaidam",
    name: "Qaidam Basin",
    body: "earth",
    region: "Qinghai, China",
    lat: 37.4,
    lon: 95,
    geology: ["evaporite-salts", "sand-dunes", "fine-regolith-dust", "clay-sulfate"],
    isolation: 8,
    status: "emerging",
    summary: "A high, cold, hyperarid basin with wind-carved yardangs that closely resemble Martian landforms.",
  },
  {
    id: "earth-wadirum",
    name: "Wadi Rum",
    body: "earth",
    region: "Jordan",
    lat: 29.6,
    lon: 35.4,
    geology: ["sand-dunes", "ancient-crystalline", "clay-sulfate"],
    isolation: 5,
    status: "proposed",
    summary: "Granite and sandstone massifs, red dunes and dry channels in a hyperarid valley. Already used as a Mars film location; prior analog use has not been fully checked.",
  },
  {
    id: "earth-lut",
    name: "Dasht-e Lut",
    body: "earth",
    region: "Kerman, Iran",
    lat: 30.5,
    lon: 59,
    geology: ["sand-dunes", "evaporite-salts", "fine-regolith-dust"],
    isolation: 9,
    status: "proposed",
    summary: "Among the hottest surfaces on Earth, with kilometre-scale yardang fields and some of the tallest dunes on Earth.",
  },
  {
    id: "earth-tibesti",
    name: "Tibesti volcanic massif",
    body: "earth",
    region: "Chad",
    lat: 21,
    lon: 17.5,
    geology: ["basalt-volcanic", "sand-dunes"],
    isolation: 10,
    status: "proposed",
    summary: "Volcanoes, calderas and lava fields ringed by Sahara dunes, one of the most remote places on Earth. At least one volcano, Tarso Tousside, is described by ESA as potentially active.",
  },
  {
    id: "earth-ladakh",
    name: "Tso Kar basin",
    body: "earth",
    region: "Ladakh, India",
    lat: 33.1,
    lon: 78,
    geology: ["evaporite-salts", "permafrost-ice", "glacial-periglacial", "ancient-crystalline"],
    isolation: 8,
    status: "emerging",
    summary: "A cold, thin-air salt basin at about 4,500 m with permafrost and ancient crystalline ranges. ISRO set up its HOPE analog mission in Tso Kar Valley in July 2025.",
  },
  {
    id: "earth-oman",
    name: "Samail Ophiolite",
    body: "earth",
    region: "Oman",
    lat: 23.3,
    lon: 58,
    geology: ["ancient-crystalline", "clay-sulfate", "basalt-volcanic"],
    isolation: 5,
    status: "proposed",
    summary: "Exposed mantle rock that reacts with water to make carbonates and clays, like the olivine and carbonate rocks mapped around Nili Fossae on Mars. Already studied in NASA-supported analog research.",
  },
  {
    id: "earth-lanzarote",
    name: "Cueva de los Verdes lava tube",
    body: "earth",
    region: "Lanzarote, Spain",
    lat: 29.15,
    lon: -13.43,
    geology: ["basalt-volcanic", "lava-tubes"],
    isolation: 3,
    status: "emerging",
    summary: "A lava tube system on a volcanic island, in a region used for ESA geology and cave training.",
  },
];

/** Relief (height range of 9 samples: the point and 8 neighbours about 15-17 km away) to the 0-10 ruggedness scale. */
export function reliefToRuggedness(reliefM: number): number {
  return Math.min(10, 10 * Math.sqrt(Math.max(0, reliefM) / 2500));
}

export interface MeasuredInput {
  elevationM: number;
  reliefM: number;
  tMeanC: number;
  tMinC: number;
  precipMm: number;
  pressureKpa: number;
  windMs: number;
  climateSource: string;
  elevationSource: string;
  fetchedAt: string;
}

/** Merge editorial seed data with measured values into a full Site. */
export function hydrateEarthSite(seed: EarthSeed, m: MeasuredInput): Site {
  return {
    ...seed,
    meanTempC: round(m.tMeanC, 1),
    minTempC: round(m.tMinC, 1),
    precipMm: Math.round(m.precipMm),
    pressureKpa: round(m.pressureKpa, 1),
    windMs: round(m.windMs, 1),
    ruggedness: round(reliefToRuggedness(m.reliefM), 1),
    measured: {
      elevationM: Math.round(m.elevationM),
      reliefM: Math.round(m.reliefM),
      climateSource: m.climateSource,
      elevationSource: m.elevationSource,
      fetchedAt: m.fetchedAt,
    },
  };
}

/** Shape of one site in the GET /api/targets response. */
export interface TargetApiSite {
  id: string;
  body: "moon" | "mars";
  lat: number;
  lon: number;
  values: Record<TargetVariable, TargetValueInfo>;
}

/** Merge editorial seed data with pipeline values into a full Site. */
export function hydrateTargetSite(seed: TargetSeed, api: TargetApiSite): Site {
  const v = api.values;
  return {
    ...seed,
    lat: api.lat,
    lon: api.lon,
    meanTempC: v.meanTempC.value,
    minTempC: v.minTempC.value,
    precipMm: 0,
    pressureKpa: v.pressureKpa.value,
    windMs: v.windMs.value,
    ruggedness: round(reliefToRuggedness(v.reliefM.value), 1),
    targetData: { elevationM: v.elevationM.value, reliefM: v.reliefM.value, values: v },
  };
}

function round(n: number, d: number) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** How the Moon and Mars numbers were produced, and what stays editorial. */
export const TARGET_REFERENCE: Record<"moon" | "mars", { values: string; geology: string }> = {
  moon: {
    values:
      "Temperature from LRO Diviner bolometric maps and elevation and relief from LRO LOLA, downloaded and processed by the pipeline. No atmosphere, so pressure and wind are 0 (reference).",
    geology: "Geology tags and isolation are editorial, curated from published site-characterisation work (Artemis candidate regions, lunar pit and lava-tube studies).",
  },
  mars: {
    values:
      "Temperature from MRO Mars Climate Sounder profiles and elevation and relief from MGS MOLA, processed by the pipeline. Pressure is derived from elevation. Wind is a 10 m model climatology from the Mars Climate Database (MCD v6.2), averaged across its seasonal and local-time grid; it is not a rover measurement or forecast.",
    geology: "Geology tags and isolation are editorial, curated from landing-site workshop reports (Jezero, Gale, Oxia, Mawrth) and mid-latitude ice studies.",
  },
};

export const KIND_LABEL: Record<ValueKind, string> = {
  "raw-derived": "raw-derived",
  derived: "derived",
  reference: "reference",
};

export const KIND_HINT: Record<ValueKind, string> = {
  "raw-derived": "Computed by the pipeline from raw NASA files",
  derived: "Calculated from a model or another stated data source; not a direct measurement",
  reference: "A fixed value that is not computed from a raster",
};

export const VARIABLE_LABEL: Record<TargetVariable, string> = {
  meanTempC: "Mean surface temperature",
  minTempC: "Coldest surface temperature",
  maxTempC: "Warmest surface temperature",
  elevationM: "Elevation",
  reliefM: "Relief (9-sample height range, ~15 km ring)",
  pressureKpa: "Surface pressure",
  windMs: "Wind",
};

export const DATA_SOURCES = [
  { name: "NASA POWER climatology (MERRA-2), skin temperature", body: "Earth", use: "Measured: surface temperature, precipitation, pressure and wind per site and grid cell", kind: "measured" },
  { name: "Global DEM, SRTM-based (via OpenTopoData)", body: "Earth", use: "Measured: elevation and local relief per site and grid cell", kind: "measured" },
  { name: "NASA GIBS Blue Marble", body: "Earth", use: "Measured: base map imagery", kind: "measured" },
  { name: "LRO Diviner bolometric temperature maps", body: "Moon", use: "Processed by the pipeline: mean, coldest and warmest surface temperature", kind: "raw-derived" },
  { name: "LRO LOLA topography", body: "Moon", use: "Processed by the pipeline: elevation and relief", kind: "raw-derived" },
  { name: "MRO Mars Climate Sounder profiles", body: "Mars", use: "Processed by the pipeline: mean, coldest and warmest surface temperature", kind: "raw-derived" },
  { name: "MGS MOLA topography", body: "Mars", use: "Processed by the pipeline: elevation and relief", kind: "raw-derived" },
  { name: "Mars pressure model (0.61 kPa, 11.1 km scale height)", body: "Mars", use: "Derived from MOLA elevation", kind: "derived" },
  { name: "Mars Climate Database v6.2 GCM climatology", body: "Mars", use: "Modeled: 10 m horizontal wind averaged across seasonal and local-time samples", kind: "derived" },
  { name: "GLiM global lithological map, 0.5° (Hartmann & Moosdorf 2012)", body: "Earth", use: "Reference: broad rock type at sites and grid cells; context only, not scored", kind: "reference" },
  { name: "Evidence registry (ISRO, NASA, ESA, LROC pit atlas)", body: "Earth / Moon", use: "Editorial: documented missions, status corrections, pit sizes, scale caveats", kind: "editorial" },
  { name: "Published analog literature", body: "Earth", use: "Editorial: geology tags, isolation, analog status", kind: "editorial" },
] as const;
