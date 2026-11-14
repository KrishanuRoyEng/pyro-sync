import { NextRequest, NextResponse } from "next/server";

const SOURCES = ["MODIS_NRT", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"] as const;
const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 50;
const cache = new Map<string, { at: number; body: unknown }>();

function lruSet(key: string, body: unknown, at = Date.now()) {
  cache.delete(key); cache.set(key, { at, body });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}
const fallback = (reason: string) => NextResponse.json({ mode: "CACHED ARCHIVE MODE", reason, detections: [] });

export async function GET(req: NextRequest) {
  const key = process.env.FIRMS_MAP_KEY; // server-side only
  const bbox = (req.nextUrl.searchParams.get("bbox") ?? "").split(",").map(Number);
  if (bbox.length !== 4 || bbox.some(Number.isNaN)) return NextResponse.json({ error: "bbox=west,south,east,north required" }, { status: 400 });
  const [w, s, e, n] = bbox;
  if (e <= w || n <= s || e - w > 10 || n - s > 10) return NextResponse.json({ error: "bbox must be positive and at most 10x10 degrees" }, { status: 400 });
  if (!key) return fallback("FIRMS_MAP_KEY not set");

  const ck = bbox.map((v) => v.toFixed(2)).join(",");
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL_MS) { lruSet(ck, hit.body, hit.at); return NextResponse.json(hit.body); }

  try {
    const results = await Promise.all(SOURCES.map(async (src) => {
      const res = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${src}/${bbox.join(",")}/1`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`${src} ${res.status}`);
      const [head, ...rows] = (await res.text()).trim().split("\n");
      const cols = head.split(",");
      const ix = (c: string) => cols.indexOf(c);
      return rows.map((r) => {
        const f = r.split(",");
        return { lat: +f[ix("latitude")], lon: +f[ix("longitude")], frp: +f[ix("frp")], sensor: src.startsWith("MODIS") ? "MODIS" : "VIIRS", sat: src, day: 0 };
      });
    }));
    const body = { mode: "LIVE", detections: results.flat() };
    lruSet(ck, body);
    return NextResponse.json(body);
  } catch (err) {
    return fallback(err instanceof Error ? err.message : "upstream error");
  }
}
