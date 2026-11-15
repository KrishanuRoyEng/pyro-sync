# PYRO-SYNC

**Harmonized MODIS + VIIRS Burning Activity Calendar (NASA Space Apps 2026)**

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Platform-black?style=flat&logo=vercel)](https://pyro-sync-tau.vercel.app)
[![Launch Video](https://img.shields.io/badge/Launch%20Video-30s%20MP4-amber?style=flat)](brag-output/brag.mp4)
[![Tests Passing](https://img.shields.io/badge/Tests-23%2F23%20Passed-emerald?style=flat)](__tests__/)

- **Live Web Application**: [https://pyro-sync-tau.vercel.app](https://pyro-sync-tau.vercel.app)
- **Product & Science Documentation**: [https://pyro-sync-tau.vercel.app/?view=product](https://pyro-sync-tau.vercel.app/?view=product)
- **GitHub Repository**: [https://github.com/KrishanuRoyEng/pyro-sync](https://github.com/KrishanuRoyEng/pyro-sync)
- **Launch Video**: [`brag-output/brag.mp4`](brag-output/brag.mp4) (30s horizontal 1080p with audio)

```bash
npm install && cp .env.local.example .env.local   # add FIRMS_MAP_KEY
npm run dev          # http://localhost:3000
npm test && npm run typecheck && npm run build
```

## Method (Deterministic, no LLM in numeric path)
1. **Hexagonal Spatial Snapping**: Snap fire detections to H3 discrete cells (resolution 7 for regional, resolution 4 for global) and group by `(cell, day, satellite)` to collapse 375 m VIIRS pixel fragmentation into a unified spatial unit matching MODIS's 1 km footprint.
2. **Sensitivity Floor Cutoff**: Apply a calibrated VIIRS FRP cutoff on the cell total (default: 2.0 MW) so small fragmented energy is retained while sub-MODIS detections below MODIS's minimum detection threshold are removed.
3. **Overpass Effort Normalization**: Sum FRP across cells and divide by the number of active satellites operating during that week, balancing the differing orbital overpasses.
4. **Historical Z-Scores & Regimes**: Standardize each calendar week $w \in [1, 52]$ across historical years ($Z = (x - \mu) / \sigma$). Tag fire regimes deterministically by FRP intensity and spatial hex contiguity (`AGRI-BURN`, `WILDFIRE-FRONT`, `STATIC-FLARE`, `BACKGROUND`).

Week indexing is computed deterministically from Day of Year (DOY, 1–366):

$$\text{week} = \min\left(52, \left\lfloor \frac{\text{DOY} - 1}{7} \right\rfloor + 1\right)$$

---

## Data Sources & Coverage Record

Coverage is strictly verified against NASA acquisition records in `public/data/manifest.json` and generated via `scripts/process_firms.py`. Coverage is **PARTIAL** and never claimed beyond what is verified:

### 1. NASA FIRMS Regional & Global Archives (`public/data/`)
- **Terra (MODIS)**: 2000-11-01 to 2017-11-30.
- **Aqua (MODIS)**: 2002-07-04 to 2017-11-30.
- **Archive Gaps**:
  - `2001-06-16` to `2001-07-02` (Terra)
  - `2002-03-20` to `2002-03-27` (Terra)
  - `2002-07-30` to `2002-08-07` (Aqua)
  - `2013-12-01` to `2016-11-30` (Both Terra and Aqua missing from archive CSVs)
- **VIIRS Archive Status**: VIIRS archive data (`SNPP`, `NOAA-20`, `NOAA-21`) is currently downloading and pending ingestion. The proof chart displays *"VIIRS data not loaded yet"* rather than fabricating comparison points.
- **Cleaning & Filtering Pipeline**: See [`docs/cleaning_report.md`](docs/cleaning_report.md) for detailed cleaning accounting (82.8M rows processed, non-vegetation and low-confidence fires dropped, duplicates across overlapping date requests eliminated, 57.7M valid detections retained).

### 2. Live Global Telemetry (Last 24 Hours)
With `FIRMS_MAP_KEY` in `.env.local`, the Live mode fetches near-real-time data from `MODIS_NRT`, `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, and `VIIRS_NOAA21_NRT`. Detections are aggregated server-side into H3 cells (res 4 globally, res 6 for user bounding boxes $\le 10^\circ \times 10^\circ$), cached 15 minutes via an in-memory LRU cache, and served in <200 KB.

### 3. Synthetic Generator (`lib/synthetic.ts`)
A deterministic seeded generator is used as a fallback **only if an archive file is missing**, and is prominently labeled as `SYNTHETIC DEMO` in the UI.

---

## Satellite Timeline
| Satellite | Sensor | First Observation | Status in Archive |
|---|---|---|---|
| **Terra** | MODIS (1 km) | 2000-11-01 | Loaded in Archive |
| **Aqua** | MODIS (1 km) | 2002-07-04 | Loaded in Archive |
| **SNPP** | VIIRS (375 m) | 2012-01-20 | Live NRT / Archive pending |
| **NOAA-20** | VIIRS (375 m) | 2018-01-05 | Live NRT / Archive pending |
| **NOAA-21** | VIIRS (375 m) | 2024-01-17 | Live NRT / Archive pending |

---

## UI Features
- **10-Second Telemetry Overview**: One-line plain-English headline computed from data.
- **Three-Step Demo Tour**:
  1. *The Problem (Raw)*: Visualizes raw detection inflation.
  2. *Harmonize*: Demonstrates continuity across sensor transitions.
  3. *Anomaly*: Automatically jumps to the highest historical Z-score anomaly.
- **Terminology Glossary**: Plain-language definitions for Raw count, Harmonized index, Z-score, H3 cells, and FRP.
- **Strict Design Standards**: Flat dark telemetry look (no gradients, blur, glow, shadows, hover-scale, or decorative icons). Colorblind-safe thermal ramp.

---

## AI Assistance Disclosure
Scaffolded with an AI coding assistant (Antigravity). In compliance with NASA Space Apps rules, this is disclosed in the submission documentation. All numeric outputs, aggregations, and calculations stem strictly from deterministic TypeScript and Python code—no LLM exists in the numeric data path.
