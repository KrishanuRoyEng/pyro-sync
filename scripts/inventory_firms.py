"""Extract FIRMS archives, inventory every CSV, and report date gaps.

    python scripts/inventory_firms.py ~/Downloads            # extract + inventory
    python scripts/inventory_firms.py ~/Downloads --jobs 4   # more parallel CSV scanning
    python scripts/inventory_firms.py --skip-extract         # only re-run the inventory on raw/

Outputs: raw/<archive>/*.csv, inventory/daily_counts.csv, docs/data_inventory.md
Safe to re-run: finished archives are skipped. Partial downloads (.crdownload/.part) are ignored.
"""
import argparse, pathlib, sys, zipfile, tarfile, datetime as dt
from concurrent.futures import ProcessPoolExecutor
import pandas as pd

RAW, INV, DOCS = pathlib.Path("raw"), pathlib.Path("inventory"), pathlib.Path("docs")
ARCH = (".zip", ".tar.gz", ".tgz", ".tar")
KNOWN_START = {"terra": "2000-11-01", "aqua": "2002-07-04"}   # MODIS; VIIRS names are checked by eye

def extract_all(src: pathlib.Path):
    for a in sorted(p for p in src.rglob("*") if p.is_file() and p.name.lower().endswith(ARCH)):
        stem = a.name
        for e in ARCH: stem = stem[: -len(e)] if stem.lower().endswith(e) else stem
        dest, done = RAW / stem, RAW / stem / ".done"
        if done.exists():
            continue
        dest.mkdir(parents=True, exist_ok=True)
        try:
            if a.suffix.lower() == ".zip":
                with zipfile.ZipFile(a) as z:
                    for m in z.namelist():
                        if m.lower().endswith(".csv"): z.extract(m, dest)
            else:
                with tarfile.open(a) as t:
                    for m in t:
                        if m.isfile() and m.name.lower().endswith(".csv"): t.extract(m, dest, filter="data")
            done.touch(); print("extracted", a.name)
        except Exception as ex:
            print("BROKEN ARCHIVE (re-download):", a.name, "-", ex)

def scan(path: str) -> pd.DataFrame:
    """One CSV -> daily rows per (instrument, satellite, date). Streams in chunks."""
    p = pathlib.Path(path)
    head = pd.read_csv(p, nrows=0).columns
    want = [c for c in ("acq_date", "satellite", "instrument", "type", "frp", "bright_ti4", "brightness") if c in head]
    if "acq_date" not in want:
        return pd.DataFrame()
    parts = []
    for ch in pd.read_csv(p, usecols=want, chunksize=1_000_000, dtype={"satellite": "string", "instrument": "string"}):
        if "instrument" not in ch:
            ch["instrument"] = "VIIRS" if "bright_ti4" in ch else "MODIS"
        if "satellite" not in ch: ch["satellite"] = "?"
        ch["veg"] = (ch["type"] == 0) if "type" in ch else True
        ch["frp"] = pd.to_numeric(ch.get("frp"), errors="coerce")
        parts.append(ch.groupby(["instrument", "satellite", "acq_date"], dropna=False)
                       .agg(rows=("frp", "size"), veg=("veg", "sum"), frp_sum=("frp", "sum"),
                            bad_frp=("frp", lambda s: int((s.isna() | (s <= 0)).sum()))).reset_index())
    d = pd.concat(parts).groupby(["instrument", "satellite", "acq_date"], as_index=False).sum()
    d["file"] = str(p.relative_to(RAW))
    return d

def ranges(days):
    out, start, prev = [], None, None
    for d in days:
        if start is None: start = prev = d
        elif d == prev + dt.timedelta(days=1): prev = d
        else: out.append((start, prev)); start = prev = d
    if start: out.append((start, prev))
    return out

def report(df: pd.DataFrame):
    df["acq_date"] = pd.to_datetime(df["acq_date"]).dt.date
    lines = ["# FIRMS data inventory", "", f"Generated {dt.datetime.now():%Y-%m-%d %H:%M}. Files scanned: {df['file'].nunique()}.", ""]
    for (ins, sat), g in df.groupby(["instrument", "satellite"]):
        days = sorted(g["acq_date"].unique())
        lo, hi = days[0], days[-1]
        full = pd.date_range(lo, hi).date
        missing = ranges([d for d in full if d not in set(days)])
        dupe = g.groupby("acq_date")["file"].nunique()
        dupe = dupe[dupe > 1]
        lines += [f"## {ins} / {sat}", f"- first {lo}, last {hi}, days with data {len(days)} of {len(full)}",
                  f"- rows {int(g['rows'].sum()):,} (vegetation fires type 0: {int(g['veg'].sum()):,}; frp missing or <=0: {int(g['bad_frp'].sum()):,})"]
        if sat.lower() in KNOWN_START and str(lo) > KNOWN_START[sat.lower()]:
            lines.append(f"- WARNING: expected data from {KNOWN_START[sat.lower()]}, first seen {lo}")
        lines.append(f"- missing date ranges: {len(missing)}" + ("" if not missing else " (" + "; ".join(f"{a}..{b}" if a != b else str(a) for a, b in missing[:40]) + (" ..." if len(missing) > 40 else "") + ")"))
        if len(dupe): lines.append(f"- WARNING: {len(dupe)} dates appear in more than one file (overlapping requests; dedupe before aggregating)")
        yr = g.assign(y=pd.to_datetime(g["acq_date"]).dt.year).groupby("y")["rows"].sum()
        lines += ["- rows per year: " + ", ".join(f"{y}: {int(n):,}" for y, n in yr.items()), ""]
    DOCS.mkdir(exist_ok=True); (DOCS / "data_inventory.md").write_text("\n".join(lines))
    print("\n".join(lines))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", default=None)
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--skip-extract", action="store_true")
    a = ap.parse_args()
    RAW.mkdir(exist_ok=True); INV.mkdir(exist_ok=True)
    if not a.skip_extract:
        if not a.src: sys.exit("give the downloads folder, e.g. python scripts/inventory_firms.py ~/Downloads")
        extract_all(pathlib.Path(a.src).expanduser())
    csvs = sorted(str(p) for p in RAW.rglob("*.csv"))
    print(f"scanning {len(csvs)} CSV files...")
    with ProcessPoolExecutor(a.jobs) as ex:
        frames = [f for f in ex.map(scan, csvs) if len(f)]
    if not frames: sys.exit("no usable CSVs found")
    df = pd.concat(frames, ignore_index=True)
    df.to_csv(INV / "daily_counts.csv", index=False)
    report(df)