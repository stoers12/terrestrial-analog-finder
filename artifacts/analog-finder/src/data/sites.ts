/**
 * Site catalogue for the Terrestrial Analog Finder.
 *
 * Moon and Mars targets are a curated REFERENCE table: values are rounded from
 * published mission results (see TARGET_REFERENCE) and are indicative only.
 *
 * Earth sites are editorial seeds (name, geology tags, isolation, status). Their
 * temperature, pressure, precipitation, wind and relief are NOT stored here: they
 * are measured at load time from NASA POWER and a global DEM by the API server and
 * merged in by hydrateEarthSite().
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

export interface Site {
  id: string;
  name: string;
  body: Body;
  region: string;
  lat: number;
  lon: number;
  /** Annual mean near-surface temperature, degrees C */
  meanTempC: number;
  /** Typical coldest-night temperature, degrees C */
  minTempC: number;
  /** Annual precipitation, mm (0 off-Earth) */
  precipMm: number;
  /** Surface atmospheric pressure, kPa (0 on the Moon, about 0.6 on Mars) */
  pressureKpa: number;
  /** Annual mean near-surface wind speed, m/s (0 on the Moon) */
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
  /** One or two sentences on why the site matters */
  summary: string;
  /** Moon/Mars sites: what a base or landing there is for */
  mission?: string;
}

export const TARGET_SITES: Site[] = [
  // ---- Moon ----
  {
    id: "moon-shackleton",
    name: "Shackleton Crater rim",
    body: "moon",
    region: "South pole",
    lat: -89.9,
    lon: 0,
    meanTempC: -100,
    minTempC: -170,
    precipMm: 0,
    pressureKpa: 0,
    windMs: 0,
    geology: ["impact-crater", "fine-regolith-dust", "permafrost-ice"],
    ruggedness: 7,
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
    lat: -85.9,
    lon: 2.9,
    meanTempC: -75,
    minTempC: -165,
    precipMm: 0,
    pressureKpa: 0,
    windMs: 0,
    geology: ["ancient-crystalline", "fine-regolith-dust", "impact-crater"],
    ruggedness: 6,
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
    lat: 14.1,
    lon: -56.7,
    meanTempC: -20,
    minTempC: -170,
    precipMm: 0,
    pressureKpa: 0,
    windMs: 0,
    geology: ["basalt-volcanic", "lava-tubes", "fine-regolith-dust"],
    ruggedness: 4,
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
    lat: 8.3,
    lon: 33.2,
    meanTempC: -20,
    minTempC: -170,
    precipMm: 0,
    pressureKpa: 0,
    windMs: 0,
    geology: ["basalt-volcanic", "lava-tubes", "fine-regolith-dust"],
    ruggedness: 2,
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
    lat: -75,
    lon: 132.4,
    meanTempC: -85,
    minTempC: -170,
    precipMm: 0,
    pressureKpa: 0,
    windMs: 0,
    geology: ["impact-crater", "basalt-volcanic", "fine-regolith-dust"],
    ruggedness: 8,
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
    lat: 18.4,
    lon: 77.6,
    meanTempC: -60,
    minTempC: -90,
    precipMm: 0,
    pressureKpa: 0.7,
    windMs: 5,
    geology: ["clay-sulfate", "impact-crater", "basalt-volcanic", "sand-dunes"],
    ruggedness: 5,
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
    lat: -5.4,
    lon: 137.8,
    meanTempC: -50,
    minTempC: -90,
    precipMm: 0,
    pressureKpa: 0.85,
    windMs: 4,
    geology: ["impact-crater", "clay-sulfate", "sand-dunes"],
    ruggedness: 8,
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
    lat: 18.2,
    lon: -24.6,
    meanTempC: -55,
    minTempC: -90,
    precipMm: 0,
    pressureKpa: 0.8,
    windMs: 5,
    geology: ["clay-sulfate", "basalt-volcanic"],
    ruggedness: 2,
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
    lat: 47,
    lon: -176,
    meanTempC: -70,
    minTempC: -120,
    precipMm: 0,
    pressureKpa: 0.9,
    windMs: 6,
    geology: ["permafrost-ice", "fine-regolith-dust"],
    ruggedness: 1,
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
    lat: -8.3,
    lon: -120.1,
    meanTempC: -60,
    minTempC: -100,
    precipMm: 0,
    pressureKpa: 0.2,
    windMs: 4,
    geology: ["basalt-volcanic", "lava-tubes"],
    ruggedness: 6,
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
    lat: 22.3,
    lon: -16.5,
    meanTempC: -55,
    minTempC: -90,
    precipMm: 0,
    pressureKpa: 0.8,
    windMs: 5,
    geology: ["clay-sulfate", "basalt-volcanic", "ancient-crystalline"],
    ruggedness: 4,
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
    summary: "Granite and sandstone massifs, red dunes and dry channels in a hyperarid valley. Already used as a Mars film location, and has no formal analog programme yet.",
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
    geology: ["basalt-volcanic", "sand-dunes", "impact-crater"],
    isolation: 10,
    status: "proposed",
    summary: "Extinct volcanoes, calderas and lava fields ringed by Sahara dunes, one of the most remote places on Earth.",
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
    status: "proposed",
    summary: "A cold, thin-air salt basin at about 4,500 m with permafrost and ancient crystalline ranges. A cold-desert setting with no formal analog programme yet.",
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
    summary: "Exposed mantle rock that reacts with water to make carbonates and clays, like the olivine and carbonate rocks mapped around Nili Fossae on Mars.",
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

/** Relief (metres within ~15 km) to the 0-10 ruggedness scale used for comparison. */
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

function round(n: number, d: number) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Where each reference value for a Moon or Mars target comes from. */
export const TARGET_REFERENCE: Record<"moon" | "mars", { values: string; geology: string }> = {
  moon: {
    values:
      "Surface temperatures rounded from LRO Diviner results (Paige et al. 2010, Williams et al. 2017); relief and illumination from LRO LOLA; no atmosphere, so no pressure or wind.",
    geology: "Geology tags and isolation are curated from published site-characterisation work (Artemis candidate regions, lunar pit and lava-tube studies).",
  },
  mars: {
    values:
      "Temperature, pressure and wind rounded from MSL REMS, InSight APSS and Mars 2020 MEDA reports; relief from MOLA and HiRISE landing-site studies.",
    geology: "Geology tags and isolation are curated from landing-site workshop reports (Jezero, Gale, Oxia, Mawrth) and mid-latitude ice studies.",
  },
};

export const DATA_SOURCES = [
  { name: "NASA POWER climatology (MERRA-2)", body: "Earth", use: "Measured: temperature, precipitation, pressure and wind per site and grid cell", measured: true },
  { name: "Global DEM, SRTM-based (via OpenTopoData)", body: "Earth", use: "Measured: elevation and local relief per site and grid cell", measured: true },
  { name: "NASA GIBS Blue Marble", body: "Earth", use: "Measured: base map imagery", measured: true },
  { name: "LRO Diviner and LOLA", body: "Moon", use: "Reference table: surface temperature, relief and illumination", measured: false },
  { name: "MSL REMS, InSight APSS, Mars 2020 MEDA", body: "Mars", use: "Reference table: temperature, pressure and wind", measured: false },
  { name: "MOLA and HiRISE landing-site studies", body: "Mars", use: "Reference table: relief and geology", measured: false },
  { name: "Published analog literature", body: "Earth", use: "Curated: geology tags, isolation, analog status", measured: false },
];
