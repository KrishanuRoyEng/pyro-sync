# PYRO-SYNC Data Format Specification

This document specifies the columnar JSON data formats produced by `scripts/process_firms.py` and consumed by `lib/dataSource.ts`.

## Week and Day Indexing Scheme

Weeks and days are defined deterministically from the calendar day of year ($1 \dots 365$ or $366$ in leap years):

$$\text{week} = \min\left(52, \left\lfloor \frac{\text{day\_of\_year} - 1}{7} \right\rfloor + 1\right)$$

$$\text{day} = (\text{day\_of\_year} - 1) - 7 \times (\text{week} - 1)$$

- **Weeks** are $1 \dots 52$.
- **Days** are $0 \dots 6$ for weeks 1–51. Week 52 contains the remaining days of the year (day offsets $0 \dots 7$ in standard years, or $0 \dots 8$ in leap years).
- This avoids fractional week boundaries and ensures every calendar day maps to an integer week $1 \dots 52$.

---

## 1. Benchmark Region Aggregates (`public/data/regions/<id>.json`)

Contains H3 resolution-7 aggregates for benchmark regions (e.g. `punjab`, `california`, `amazon`). Columnar format where arrays share an index.

```json
{
  "region": "punjab",
  "bbox": [73.5, 28.5, 77.5, 32.5],
  "res": 7,
  "sats": ["Terra", "Aqua", "SNPP", "NOAA-20", "NOAA-21"],
  "hexes": ["873d10010ffffff", "..."],
  "h": [0, 1, 2],
  "y": [2009, 2009, 2009],
  "w": [16, 16, 17],
  "d": [4, 5, 0],
  "s": [0, 1, 0],
  "frp": [9.0, 14.5, 22.1],
  "n": [1, 2, 3]
}
```

| Field | Type | Description |
|---|---|---|
| `region` | `string` | Region identifier (`punjab`, `california`, `amazon`) |
| `bbox` | `[number, number, number, number]` | Bounding box `[west, south, east, north]` |
| `res` | `number` | H3 spatial resolution (`7`, ~5.2 km² per cell) |
| `sats` | `string[]` | Satellite names lookup table |
| `hexes` | `string[]` | Unique H3 cell indexes |
| `h` | `number[]` | Index into `hexes` |
| `y` | `number[]` | Calendar year (e.g. 2000–2017) |
| `w` | `number[]` | Week of year ($1 \dots 52$) |
| `d` | `number[]` | Day offset within week ($0 \dots 8$) |
| `s` | `number[]` | Index into `sats` |
| `frp` | `number[]` | Sum of Fire Radiative Power (MW) for the cell/day/satellite |
| `n` | `number[]` | Count of raw satellite detections before grouping |

---

## 2. Global Yearly Aggregates (`public/data/global/<year>.json`)

Contains global H3 resolution-4 (~1,770 km² per cell) weekly totals split by sensor family. Loaded lazily only for the active year.

```json
{
  "year": 2000,
  "res": 4,
  "families": ["MODIS", "VIIRS"],
  "hexes": ["840c113ffffffff", "..."],
  "h": [0, 1],
  "w": [52, 52],
  "k": [0, 0],
  "frp": [556.1, 120.4],
  "n": [4, 1]
}
```

| Field | Type | Description |
|---|---|---|
| `year` | `number` | Calendar year |
| `res` | `number` | H3 spatial resolution (`4`) |
| `families` | `string[]` | Sensor family names: `["MODIS", "VIIRS"]` |
| `hexes` | `string[]` | Unique H3 cell strings |
| `h` | `number[]` | Index into `hexes` |
| `w` | `number[]` | Week of year ($1 \dots 52$) |
| `k` | `number[]` | Index into `families` (`0` = MODIS, `1` = VIIRS) |
| `frp` | `number[]` | Sum FRP (MW) |
| `n` | `number[]` | Raw detection count |

---

## 3. Global Totals (`public/data/global/totals.json`)

Weekly global totals per satellite used for the long-term harmonization proof chart:

```json
{
  "sats": ["Terra", "Aqua", "SNPP", "NOAA-20", "NOAA-21"],
  "y": [2000, 2000],
  "w": [44, 45],
  "s": [0, 0],
  "n": [12450, 18900],
  "frp": [450123.4, 680210.8]
}
```

---

## 4. Coverage Manifest (`public/data/manifest.json`)

Records exact coverage and missing date ranges per satellite based strictly on downloaded NASA FIRMS archives:

```json
{
  "Terra": {
    "first": "2000-11-01",
    "last": "2017-11-30",
    "missing": [
      ["2001-06-16", "2001-07-02"],
      ["2002-03-20", "2002-03-27"],
      ["2002-04-15", "2002-04-15"],
      ["2003-12-17", "2003-12-23"],
      ["2008-12-21", "2008-12-22"],
      ["2013-12-01", "2016-11-30"]
    ]
  },
  "Aqua": {
    "first": "2002-07-04",
    "last": "2017-11-30",
    "missing": [
      ["2002-07-30", "2002-08-07"],
      ["2002-09-13", "2002-09-13"],
      ["2013-12-01", "2016-11-30"]
    ]
  }
}
```

Active satellites for any week $(y, w)$ are evaluated by checking whether the week overlaps $[first, last]$ and is not wholly contained within any `missing` gap.
