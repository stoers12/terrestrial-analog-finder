# Terrestrial Analog Finder

NASA Space Apps 2026 entry: pick a Moon or Mars base/landing site and rank Earth sites, plus a global grid search for uncatalogued places, by how well they analog it. Web app in `artifacts/analog-finder`, backed by `artifacts/api-server`.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/analog-finder/src/data/sites.ts` — editorial seeds for Moon, Mars and Earth sites (geology, isolation, summary, status); no hand-typed numbers
- `artifacts/api-server/src/pipeline/` — Moon/Mars data pipeline (`pnpm --filter @workspace/api-server run ingest:targets`) writing `src/pipeline/data/targets-snapshot.json`; `lib/targets.ts` loads it into the `target_values` table at start-up; `GET /api/targets` serves it
- `artifacts/analog-finder/src/lib/similarity.ts` — scoring; `lib/discoveries.ts` — grid scoring and discovery selection
- `artifacts/api-server/src/lib/upstream.ts` — NASA POWER and elevation fetching; `measure.ts` — DB-cached measurements; `grid-job.ts` — background global grid fill
- `lib/db/src/schema/measurements.ts` — cache tables; `lib/api-spec/openapi.yaml` — API contract

## Architecture decisions

- Earth temperature, pressure, rain, wind and relief are measured (NASA POWER + global DEM) and cached in Postgres; none are hand-typed. Moon/Mars values are computed by the pipeline from raw LRO/MGS/MRO files and labelled raw-derived, derived (Mars pressure) or reference (Mars wind, Moon pressure/wind). All temperatures are surface (skin) temperatures: Earth uses NASA POWER TS, and the Moon/Mars use Diviner and MCS.
- The global grid scores only the 5 measurable dimensions (no geology, no isolation); scoring runs client-side with the same functions as the site ranking.
- The grid job starts when the API server boots and fills the DB in the background (about 1,350 land cells at 4 degrees). A fresh database (including production) fills on first start.
- Upstream failures surface as errors (502 / grid status); there is no fallback to made-up numbers.

## Product

Pick a Moon or Mars target; see ranked Earth analogs on a map, per-site comparison with what to test and where the analogy breaks, a global heat layer, a Discoveries list of uncatalogued cells, weight sliders, and an all-targets matrix.

## User preferences

- The interface should look beautiful and technical — a polished, instrument-like UI is a standing goal, not a one-off restyle (asked while reworking the planner page).

## Gotchas

- A cold measurements cache makes the planner page take about 70 seconds to load: `POST /api/measurements` with all `EARTH_SEEDS` points takes ~66 s cold (one NASA POWER + DEM fetch per site) and milliseconds once cached in Postgres. After a fresh database, warm it once rather than assuming the page is broken.
- The global grid job starts on the first `GET /api/grid` and fills about 1,350 land cells in the background, so the Discoveries panel and heat layer fill in over several minutes on a fresh database.
- CARTO map tiles need an API key; the map uses NASA GIBS Blue Marble tiles instead.
- OpenTopoData public API allows 1 request/second and the `srtm90m` dataset returns null at high latitudes; the code uses the global `mapzen` dataset.
- NASA POWER wind and pressure are MERRA-2 grid values (about 50 km), so mountain sites are smoothed.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## Lunar data pack

- Rebuild processed files with `node artifacts/analog-finder/scripts/build-pack-data.mjs <pack dir>`; the original pack archive is intentionally excluded from git.
- Run `pnpm --filter @workspace/api-server run ingest:targets -- --moon-only` to refresh Moon targets without downloading Mars MCS data.
- LROC pit dimensions, USGS map units, GLiM rock classes and PRP polar values are context or filters, never scored dimensions. PRP is a thermal model, not ice detection.
- Every displayed number must come from a source file or the data pipeline.
