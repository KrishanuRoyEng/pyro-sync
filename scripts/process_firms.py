"""Clean FIRMS CSVs in raw/ and write the small aggregate files the website loads.

    pip install h3 pandas numpy
    python scripts/process_firms.py            # reads raw/**/*.csv

Outputs
  public/data/regions/<id>.json   H3 res-7 daily-per-satellite aggregates for each benchmark region
  public/data/global/<year>.json  H3 res-4 weekly aggregates per sensor family (MODIS=0, VIIRS=1)
  public/data/global/totals.json  weekly totals per satellite (rows, sum FRP): proof-chart input
  public/data/manifest.json       coverage: first/last date and missing ranges per satellite
  docs/cleaning_report.md         every cleaning step with counts (evidence for the judges)
Week = min(52, (day_of_year-1)//7 + 1); day = offset inside that week (0..8 for week 52).
"""
import json, pathlib, sys, datetime as dt
import numpy as np, pandas as pd
from h3.api import basic_int as h3i

RAW = pathlib.Path("raw")
OUT = pathlib.Path("public/data")
REGIONS = {  # west, south, east, north
    "punjab": (73.5, 28.5, 77.5, 32.5),
    "california": (-124.5, 35.0, -118.0, 42.0),
    "amazon": (-65.0, -17.0, -55.0, -7.0),
}
SAT_MAP = {"terra": "Terra", "aqua": "Aqua", "n": "SNPP", "npp": "SNPP", "snpp": "SNPP", "suomi-npp": "SNPP", "j0": "SNPP",
           "1": "NOAA-20", "n20": "NOAA-20", "noaa-20": "NOAA-20", "j1": "NOAA-20",
           "2": "NOAA-21", "n21": "NOAA-21", "noaa-21": "NOAA-21", "j2": "NOAA-21"}
SATS = ["Terra", "Aqua", "SNPP", "NOAA-20", "NOAA-21"]
FAMILY = {"Terra": 0, "Aqua": 0, "SNPP": 1, "NOAA-20": 1, "NOAA-21": 1}
STEPS = {}  # cleaning counters
def count(k, n): STEPS[k] = STEPS.get(k, 0) + int(n)

def sat_from_name(name: str):
    n = name.upper()
    if "J1V" in n: return "NOAA-20"
    if "J2V" in n: return "NOAA-21"
    if "_SV-" in n or "SV-C2" in n: return "SNPP"
    return None

def hexes(lat, lon, res, scale):
    """H3 cell ids. Computes each distinct rounded point once (fast), then maps back."""
    la = np.round(lat * scale).astype(np.int64) + 90 * scale
    lo = np.round(lon * scale).astype(np.int64) + 180 * scale
    M = 360 * scale + 1
    uk, inv = np.unique(la * M + lo, return_inverse=True)
    ula, ulo = uk // M - 90 * scale, uk % M - 180 * scale
    cells = np.array([h3i.latlng_to_cell(a / scale, b / scale, res) for a, b in zip(ula, ulo)], dtype=np.uint64)
    return cells[inv]

def clean_chunk(ch: pd.DataFrame, fname: str, owner: dict, fidx: int):
    count("rows_read", len(ch))
    if "type" in ch:
        keep = ch["type"] == 0; count("dropped_not_vegetation_fire", (~keep).sum()); ch = ch[keep]
    frp = pd.to_numeric(ch["frp"], errors="coerce")
    keep = frp > 0; count("dropped_frp_missing_or_nonpositive", (~keep).sum()); ch = ch[keep].assign(frp=frp[keep])
    if "confidence" in ch:
        c = ch["confidence"].astype(str).str.lower(); num = pd.to_numeric(ch["confidence"], errors="coerce")
        low = ((num < 30).fillna(False) | c.isin(["l", "low"])).to_numpy(dtype=bool)
        count("dropped_low_confidence", low.sum()); ch = ch[~low]
    if ch.empty: return ch
    s = ch["satellite"].astype(str).str.lower().map(SAT_MAP)
    hint = sat_from_name(fname)
    if hint: s = s.fillna(hint)
    s = s.fillna(ch["satellite"].astype(str))
    ch = ch.assign(sat=s)
    unk = ch["sat"][~ch["sat"].isin(SATS)]
    if len(unk): count("dropped_unknown_satellite:" + ",".join(sorted(set(unk))), len(unk)); ch = ch[ch["sat"].isin(SATS)]
    d = pd.to_datetime(ch["acq_date"])
    code = ch["sat"].map({s: i for i, s in enumerate(SATS)}).to_numpy()
    key = code * 100000 + ((d - pd.Timestamp("1970-01-01")).dt.days.to_numpy())
    allowed = [k for k in np.unique(key) if owner.setdefault(int(k), fidx) == fidx]
    mask = np.isin(key, allowed); count("dropped_duplicate_date_from_other_file", (~mask).sum())
    ch, d = ch[mask], d[mask]
    doy = d.dt.day_of_year.to_numpy(); week = np.minimum(52, (doy - 1) // 7 + 1)
    return ch.assign(year=d.dt.year.to_numpy(), week=week, day=doy - 1 - 7 * (week - 1), date=d.dt.date)

def merge(acc, new, keys):
    return new if acc is None else pd.concat([acc, new]).groupby(keys, as_index=False).sum()

def main():
    files = sorted(RAW.rglob("*.csv"))
    if not files: sys.exit("no CSVs under raw/")
    owner, glob_year, reg, totals, seen = {}, {}, {r: None for r in REGIONS}, None, {}
    for fidx, f in enumerate(files):
        head = pd.read_csv(f, nrows=0).columns
        if "acq_date" not in head or "frp" not in head: print("skip (not fire data):", f.name); continue
        cols = [c for c in ("latitude", "longitude", "acq_date", "satellite", "confidence", "type", "frp") if c in head]
        print(f"[{fidx + 1}/{len(files)}] {f.name}", flush=True)
        for ch in pd.read_csv(f, usecols=cols, chunksize=1_000_000, dtype={"satellite": "string", "confidence": "string"}):
            ch = clean_chunk(ch, f.name, owner, fidx)
            if ch.empty: continue
            count("rows_kept", len(ch))
            for (sat, dd), n in ch.groupby(["sat", "date"]).size().items(): seen.setdefault(sat, set()).add(dd)
            ch = ch.assign(s=ch["sat"].map({s: i for i, s in enumerate(SATS)}), k=ch["sat"].map(FAMILY), n=1)
            totals = merge(totals, ch.groupby(["year", "week", "s"], as_index=False)[["n", "frp"]].sum(), ["year", "week", "s"])
            lat, lon = ch["latitude"].to_numpy(), ch["longitude"].to_numpy()
            ch = ch.assign(h4=hexes(lat, lon, 4, 50))
            for y, g in ch.groupby("year"):
                glob_year[y] = merge(glob_year.get(y), g.groupby(["h4", "week", "k"], as_index=False)[["n", "frp"]].sum(), ["h4", "week", "k"])
            for rid, (w, s_, e, n_) in REGIONS.items():
                m = (lon >= w) & (lon <= e) & (lat >= s_) & (lat <= n_)
                if m.any():
                    g = ch[m]; g = g.assign(h7=hexes(g["latitude"].to_numpy(), g["longitude"].to_numpy(), 7, 1000))
                    reg[rid] = merge(reg[rid], g.groupby(["h7", "year", "week", "day", "s"], as_index=False)[["n", "frp"]].sum(), ["h7", "year", "week", "day", "s"])

    (OUT / "global").mkdir(parents=True, exist_ok=True); (OUT / "regions").mkdir(exist_ok=True); pathlib.Path("docs").mkdir(exist_ok=True)
    hx = lambda a: [h3i.int_to_str(int(v)) for v in a]
    def table(df, hcol):
        u, inv = np.unique(df[hcol].to_numpy(), return_inverse=True)
        return hx(u), inv.tolist()
    for y, df in glob_year.items():
        hs, h = table(df, "h4")
        (OUT / "global" / f"{y}.json").write_text(json.dumps({"year": int(y), "res": 4, "families": ["MODIS", "VIIRS"], "hexes": hs, "h": h,
            "w": df["week"].tolist(), "k": df["k"].astype(int).tolist(), "frp": df["frp"].round(2).tolist(), "n": df["n"].astype(int).tolist()}, separators=(",", ":")))
    for rid, df in reg.items():
        if df is None: continue
        hs, h = table(df, "h7")
        (OUT / "regions" / f"{rid}.json").write_text(json.dumps({"region": rid, "bbox": REGIONS[rid], "res": 7, "sats": SATS, "hexes": hs, "h": h,
            "y": df["year"].tolist(), "w": df["week"].tolist(), "d": df["day"].tolist(), "s": df["s"].astype(int).tolist(),
            "frp": df["frp"].round(2).tolist(), "n": df["n"].astype(int).tolist()}, separators=(",", ":")))
    (OUT / "global" / "totals.json").write_text(json.dumps({"sats": SATS, "y": totals["year"].tolist(), "w": totals["week"].tolist(),
        "s": totals["s"].astype(int).tolist(), "n": totals["n"].astype(int).tolist(), "frp": totals["frp"].round(1).tolist()}, separators=(",", ":")))

    def gaps(days):
        days = sorted(days); out, a = [], None
        full = pd.date_range(days[0], days[-1]).date; have = set(days); miss = [d for d in full if d not in have]
        for d in miss:
            if a and d == b + dt.timedelta(days=1): b = d
            else:
                if a: out.append([str(a), str(b)])
                a = b = d
        if a: out.append([str(a), str(b)])
        return out
    manifest = {s: {"first": str(min(d)), "last": str(max(d)), "missing": gaps(d)} for s, d in seen.items()}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    rep = ["# Cleaning report", "", "Counts from scripts/process_firms.py (generated, not hand-edited).", ""] + [f"- {k}: {v:,}" for k, v in STEPS.items()]
    rep += ["", "## Coverage"] + [f"- {s}: {m['first']} to {m['last']}, {len(m['missing'])} gap(s): {m['missing'][:12]}" for s, m in manifest.items()]
    pathlib.Path("docs/cleaning_report.md").write_text("\n".join(rep)); print("\n".join(rep))

if __name__ == "__main__":
    main()