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

- `artifacts/analog-finder/src/data/sites.ts` — Moon/Mars reference table and Earth editorial seeds (geology, isolation, status)
- `artifacts/analog-finder/src/lib/similarity.ts` — scoring; `lib/discoveries.ts` — grid scoring and discovery selection
- `artifacts/api-server/src/lib/upstream.ts` — NASA POWER and elevation fetching; `measure.ts` — DB-cached measurements; `grid-job.ts` — background global grid fill
- `lib/db/src/schema/measurements.ts` — cache tables; `lib/api-spec/openapi.yaml` — API contract

## Architecture decisions

- Earth temperature, pressure, rain, wind and relief are measured (NASA POWER + global DEM) and cached in Postgres; none are hand-typed. Moon/Mars values are a curated reference table and the app says so.
- The global grid scores only the 5 measurable dimensions (no geology, no isolation); scoring runs client-side with the same functions as the site ranking.
- The grid job starts when the API server boots and fills the DB in the background (about 1,350 land cells at 4 degrees). A fresh database (including production) fills on first start.
- Upstream failures surface as errors (502 / grid status); there is no fallback to made-up numbers.

## Product

Pick a Moon or Mars target; see ranked Earth analogs on a map, per-site comparison with what to test and where the analogy breaks, a global heat layer, a Discoveries list of uncatalogued cells, weight sliders, and an all-targets matrix.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- CARTO map tiles need an API key; the map uses NASA GIBS Blue Marble tiles instead.
- OpenTopoData public API allows 1 request/second and the `srtm90m` dataset returns null at high latitudes; the code uses the global `mapzen` dataset.
- NASA POWER wind and pressure are MERRA-2 grid values (about 50 km), so mountain sites are smoothed.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
