"""Gzip the big JSON files under public/data so they fit the deployment limit.
Plain originals move to data_src/plain/ (outside public/, not deployed). The app must load *.json.gz with
DecompressionStream. manifest.json stays plain.
    .venv/bin/python scripts/gzip_data.py
"""
import gzip, pathlib, shutil
P, BK = pathlib.Path("public/data"), pathlib.Path("data_src/plain")
tot0 = tot1 = 0
for f in sorted(P.rglob("*.json")):
    if f.name == "manifest.json" or f.stat().st_size < 200_000: continue
    dst = f.with_name(f.name + ".gz")
    with open(f, "rb") as a, gzip.open(dst, "wb", compresslevel=9) as b: shutil.copyfileobj(a, b)
    bk = BK / f.relative_to(P); bk.parent.mkdir(parents=True, exist_ok=True); shutil.move(str(f), bk)
    tot0 += bk.stat().st_size; tot1 += dst.stat().st_size
    print(f"{f.relative_to(P)}: {bk.stat().st_size/1e6:.1f} MB -> {dst.stat().st_size/1e6:.1f} MB")
print(f"total {tot0/1e6:.0f} MB -> {tot1/1e6:.0f} MB")