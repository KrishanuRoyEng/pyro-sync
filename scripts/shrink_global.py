"""Re-aggregate public/data/global/<year>.json from H3 res 4 to a coarser resolution (default 3).
Originals move to data_src/global_res4/ (outside public/, so they are not deployed).
    .venv/bin/python scripts/shrink_global.py          # res 3
    .venv/bin/python scripts/shrink_global.py --res 3
"""
import argparse, json, pathlib, shutil
import numpy as np, pandas as pd
from h3.api import basic_int as h3i

ap = argparse.ArgumentParser(); ap.add_argument("--res", type=int, default=3); a = ap.parse_args()
G = pathlib.Path("public/data/global"); BK = pathlib.Path("data_src/global_res4"); BK.mkdir(parents=True, exist_ok=True)
for f in sorted(G.glob("[0-9][0-9][0-9][0-9].json")):
    d = json.load(open(f))
    if d["res"] <= a.res:
        print("skip", f.name, "already res", d["res"]); continue
    parents = np.array([h3i.cell_to_parent(h3i.str_to_int(h), a.res) for h in d["hexes"]], dtype=np.uint64)
    df = pd.DataFrame({"p": parents[np.array(d["h"])], "w": d["w"], "k": d["k"], "frp": d["frp"], "n": d["n"]})
    df = df.groupby(["p", "w", "k"], as_index=False).sum()
    u, inv = np.unique(df["p"].to_numpy(), return_inverse=True)
    out = {"year": d["year"], "res": a.res, "families": d["families"], "hexes": [h3i.int_to_str(int(v)) for v in u], "h": inv.tolist(),
           "w": df["w"].tolist(), "k": df["k"].astype(int).tolist(), "frp": df["frp"].round(1).tolist(), "n": df["n"].astype(int).tolist()}
    before = f.stat().st_size
    shutil.copy(f, BK / f.name)
    f.write_text(json.dumps(out, separators=(",", ":")))
    print(f"{f.name}: {before/1e6:.1f} MB -> {f.stat().st_size/1e6:.1f} MB ({len(d['hexes'])} -> {len(u)} hexes)")