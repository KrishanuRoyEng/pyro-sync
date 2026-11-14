"""Yearly sanity table from public/data/global/totals.json. Run from the repo root:
    .venv/bin/python scripts/check_totals.py
Raw rows should jump in 2012 (VIIRS). FRP per satellite should stay far steadier."""
import json, collections
t = json.load(open("public/data/global/totals.json"))
n, f = collections.defaultdict(float), collections.defaultdict(float)
sats, weeks = collections.defaultdict(set), collections.defaultdict(set)
for y, w, s, a, b in zip(t["y"], t["w"], t["s"], t["n"], t["frp"]):
    n[y] += a; f[y] += b; sats[y].add(s); weeks[y].add(w)
print("year  weeks  sats       raw_rows       total_FRP_MW   FRP_per_sat_MW")
for y in sorted(n):
    k = len(sats[y]); print(f"{y}  {len(weeks[y]):>5}  {k:>4}  {int(n[y]):>13,}  {f[y]:>16,.0f}  {f[y]/k:>16,.0f}")