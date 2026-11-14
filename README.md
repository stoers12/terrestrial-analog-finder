# Terrestrial Analog Finder

Compare candidate Moon and Mars locations with terrestrial analog sites using
NASA climate, planetary observations, and terrain data.

Built for the NASA Space Apps Challenge 2026. This is an independent project;
it is not an official NASA product.

## Features

- Ranked terrestrial analog sites with adjustable comparison weights.
- Interactive map, global heat layer, and candidate analog discoveries.
- Per-site comparisons and an all-targets comparison matrix.
- Moon and Mars values processed from scientific source files.
- Source attribution and distinctions between processed, derived, and reference values.

## Data and limitations

| Area | Sources |
| --- | --- |
| Earth climate | NASA POWER climatology, including surface skin temperature |
| Earth terrain | Global elevation model served through OpenTopoData |
| Moon | LRO Diviner surface-temperature products and LOLA topography |
| Mars | MRO MCS temperature products and MGS MOLA topography |
| Map imagery | NASA GIBS |

The repository includes the processed planetary snapshot and the pipeline used
to generate it. Consult each value's provenance and the app's **Data and method**
dialog for its source, processing date, assumptions, and validation checks.
Not every value is a direct measurement: some are model-derived or reference
values. Climate grids have finite spatial resolution, and the ranking is an
exploration aid, not a mission-safety assessment.

## Project structure

```text
artifacts/analog-finder/   React + Vite web application
artifacts/api-server/      Express API and planetary data pipeline
lib/db/                    PostgreSQL schema and database client
lib/api-spec/              OpenAPI contract
lib/api-client-react/      Generated frontend API client
lib/api-zod/               Generated request/response validation
```

## Requirements

- Node.js 24 and pnpm.
- PostgreSQL, configured through `DATABASE_URL`.
- Internet access to the upstream scientific data services.

Keep real connection strings and other credentials out of Git. Provide them
through your hosting environment or secret manager.

## Install and run

```sh
pnpm install --frozen-lockfile
```

In Replit, use the existing API and web workflows; routing and service
environment settings are defined in the artifact configuration.

For another environment, run the API and frontend separately:

```sh
# Terminal 1: supply DATABASE_URL securely before starting
PORT=5000 pnpm --filter @workspace/api-server run dev

# Terminal 2
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/analog-finder run dev
```

Outside Replit, configure a reverse proxy to route `/api` to the API server and
other requests to the frontend. The frontend does not include a local API proxy.
The API initializes its tables and loads the included planetary snapshot on
startup. Earth measurements are cached in PostgreSQL; populating the global
grid takes time and requires upstream network access.

## Development commands

```sh
pnpm run typecheck
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run ingest:targets
```

The planetary ingestion command downloads and processes source data; it can be
slow and depends on upstream availability. Its output is distinct from the
runtime Earth-measurement cache.

## Repository scope

This repository backs up source code, dependency lockfiles, and the included
planetary snapshot. It does **not** back up the live PostgreSQL database,
hosting secrets, or the running website. Publishing the website is a separate
operation.
