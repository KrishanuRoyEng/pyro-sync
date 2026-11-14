# PYRO-SYNC

Harmonized MODIS + VIIRS burning activity calendar (NASA Space Apps 2026).

    npm install && cp .env.local.example .env.local   # add FIRMS_MAP_KEY
    npm run dev          # http://localhost:3000
    npm test && npm run typecheck && npm run build

## Method (deterministic, no LLM in the numeric path)
1. Snap detections to H3 cells; group by (cell, day, satellite) to undo VIIRS pixel fragmentation.
2. Apply the VIIRS FRP cutoff to the cell total so VIIRS matches MODIS's minimum detectable fire.
3. Sum FRP, divide by number of active satellites.
4. Z-score each week of year across years; tag regimes by FRP and hex contiguity.

## Data sources

### Archive
The default archive is a **synthetic, seeded generator** (`lib/synthetic.ts`) that mimics sensor behaviour.
It is not NASA data. When real FIRMS archive data is placed in `public/data/regions/<regionId>.json`,
the app automatically detects it and labels the source as "NASA FIRMS archive".
See [`docs/data-format.md`](docs/data-format.md) for the file schema.

### Live (last 24 hours)
With a valid `FIRMS_MAP_KEY` in `.env.local`, the Live mode fetches near-real-time data from
MODIS_NRT, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, and VIIRS_NOAA21_NRT via the FIRMS API.
Data is aggregated server-side into H3 cells, cached 15 minutes, and served under 1 MB.
If the key is missing or the upstream is unavailable, the app falls back to archive mode
with a clear status indicator.

## Satellite timeline
| Satellite | Sensor | Active from | Notes |
|-----------|--------|-------------|-------|
| Terra     | MODIS  | 2000-11     | 1 km pixels |
| Aqua      | MODIS  | 2002-07     | 1 km pixels |
| SNPP      | VIIRS  | 2012-01     | 375 m pixels → pixel fragmentation |
| NOAA-20   | VIIRS  | 2018-01     | 375 m pixels |
| NOAA-21   | VIIRS  | 2024-01     | 375 m pixels |

## Design rules
- Flat dark telemetry look, no gradients/glassmorphism/glow/hover-scale/decorative icons
- Inter for labels, JetBrains Mono (tabular-nums) for numbers
- Colorblind-safe thermal ramp (dark → amber → orange → yellow → white)
- Fixed 100dvh layout: 40px top bar, map 65% / inspector 35%, 240px calendar dock
- Mobile fallback: panels stack under 900px

## AI assistance
Code scaffolded with an AI coding assistant (Antigravity/Claude); disclose this in the Space Apps submission form.
All numeric outputs are deterministic code — no LLM in the data path. Synthetic data is always labeled as such.
