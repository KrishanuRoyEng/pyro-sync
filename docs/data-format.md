# PYRO-SYNC data format

## Region archive files

Path: `public/data/regions/<regionId>.json` (or `.json.gz`)

Each file is a JSON array of weekly H3 resolution-7 aggregates. One object per
(hex, year, week, day, satellite) group.

### Schema

```json
[
  {
    "hex": "872a10680ffffff",
    "year": 2012,
    "week": 44,
    "day": 3,
    "satellite": "SNPP",
    "sum_frp": 42.7,
    "raw_count": 12
  }
]
```

| Field       | Type     | Description |
|-------------|----------|-------------|
| `hex`       | `string` | H3 index at resolution 7 |
| `year`      | `number` | Calendar year (2000–2026) |
| `week`      | `number` | ISO week of year (1–52) |
| `day`       | `number` | Day within the week (0–6, 0 = Monday) |
| `satellite` | `string` | Satellite ID: `Terra`, `Aqua`, `SNPP`, `NOAA-20`, or `NOAA-21` |
| `sum_frp`   | `number` | Sum of Fire Radiative Power (MW) for all detections in this (hex, day, satellite) group |
| `raw_count` | `number` | Count of raw detections before grouping |

### Design rationale

- **H3 res 7** (~5.16 km² per cell): matches MODIS's 1 km pixel footprint
  while keeping file size manageable. The harmonizer can aggregate upward to
  res 5 or 6 at runtime.
- **Per-day, per-satellite**: preserves overpass granularity so the harmonizer
  can apply the VIIRS FRP cutoff per cell-day-satellite group, then divide by
  active satellite count.
- **Sum FRP + raw count**: the harmonizer needs both. Sum FRP is the basis of
  the harmonized thermal index; raw count shows the MODIS-vs-VIIRS pixel
  fragmentation effect.

### Processing pipeline (to be implemented)

A script will:
1. Read raw FIRMS archive CSVs from `raw/`.
2. Snap each detection to H3 res 7 via `h3-js`.
3. Group by `(hex, year, ISO-week, day-of-week, satellite)`.
4. Sum FRP and count rows per group.
5. Deduplicate overlapping date ranges (per `data_inventory.md` warnings).
6. Write to `public/data/regions/<regionId>.json`.

Until this script runs, `lib/dataSource.ts` falls back to the seeded synthetic
generator. No code changes are needed — just drop the file in.

### Adding VIIRS data

To add VIIRS archive data (currently only MODIS is downloaded):
1. Request VIIRS_SNPP, VIIRS_NOAA20, VIIRS_NOAA21 archives from FIRMS.
2. Run the processing script with the combined CSVs.
3. The file format is the same; `satellite` values are `SNPP`, `NOAA-20`,
   `NOAA-21` for VIIRS and `Terra`, `Aqua` for MODIS.
4. `lib/dataSource.ts` will detect the file and label it as
   "NASA FIRMS archive" in the UI.

## Live API response

`GET /api/firms/live?res=4` returns H3-aggregated last-24h detections:

```json
{
  "mode": "LIVE",
  "timestamp": "2026-11-14T12:00:00.000Z",
  "cells": [
    {
      "hex": "841234bffffffff",
      "count": 47,
      "sum_frp": 312.4,
      "modis_count": 5,
      "viirs_snpp_count": 12,
      "viirs_noaa20_count": 18,
      "viirs_noaa21_count": 12,
      "density": 0.176
    }
  ],
  "total_detections": 14832,
  "per_sensor": { "MODIS": 1200, "VIIRS": 13632, "SNPP": 4500, "NOAA-20": 5100, "NOAA-21": 4032 }
}
```

When the key is missing or upstream fails:

```json
{
  "mode": "CACHED ARCHIVE MODE",
  "reason": "FIRMS_MAP_KEY not set",
  "cells": [],
  "total_detections": 0,
  "per_sensor": {}
}
```
