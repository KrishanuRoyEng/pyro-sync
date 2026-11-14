import { NextRequest, NextResponse } from "next/server";
import { latLngToCell } from "h3-js";

/* ---------- Constants ---------- */
const SOURCES = ["MODIS_NRT", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"] as const;
type Source = (typeof SOURCES)[number];
const TTL_MS = 15 * 60 * 1000; // 15-minute cache
const MAX_ENTRIES = 50;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BBOX_DEG = 10;
const VIIRS_FRP_CUTOFF = 2.0; // 2.0 MW cutoff on cell total

/* ---------- LRU cache ---------- */
interface CacheEntry {
  at: number;
  body: LiveResponse;
}
const cache = new Map<string, CacheEntry>();

function lruSet(key: string, body: LiveResponse, at = Date.now()) {
  cache.delete(key);
  cache.set(key, { at, body });
  if (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

/* ---------- Response types ---------- */
export interface LiveH3Cell {
  hex: string;
  count: number;
  sum_frp: number;
  modis_count: number;
  viirs_count: number;
  density: number;
}

export interface LiveResponse {
  mode: "LIVE" | "CACHED ARCHIVE MODE";
  timestamp?: string;
  reason?: string;
  cells: LiveH3Cell[];
  total_detections: number;
  per_sensor: {
    raw: Record<string, number>;
    harmonized: Record<string, number>;
  };
  harmonized_index: number;
}

const HEX_AREA_KM2: Record<number, number> = { 4: 1770, 5: 252.9, 6: 36.13, 7: 5.161 };

const fallback = (reason: string): NextResponse<LiveResponse> =>
  NextResponse.json({
    mode: "CACHED ARCHIVE MODE",
    reason,
    cells: [],
    total_detections: 0,
    per_sensor: { raw: {}, harmonized: {} },
    harmonized_index: 0,
  });

/* ---------- Raw detection parser ---------- */
interface RawDetection {
  lat: number;
  lon: number;
  frp: number;
  source: Source;
  sat: string;
}

function parseCSV(text: string, source: Source): RawDetection[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const latIdx = header.indexOf("latitude");
  const lonIdx = header.indexOf("longitude");
  const frpIdx = header.indexOf("frp");
  if (latIdx < 0 || lonIdx < 0 || frpIdx < 0) return [];

  const satName =
    source === "MODIS_NRT"
      ? "MODIS"
      : source === "VIIRS_SNPP_NRT"
      ? "SNPP"
      : source === "VIIRS_NOAA20_NRT"
      ? "NOAA-20"
      : "NOAA-21";

  const dets: RawDetection[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const f = row.split(",");
    const lat = +f[latIdx];
    const lon = +f[lonIdx];
    const frp = +f[frpIdx];
    if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(frp)) {
      dets.push({ lat, lon, frp, source, sat: satName });
    }
  }
  return dets;
}

/* ---------- Aggregator ---------- */
function aggregateDetections(dets: RawDetection[], zoomRes: number): {
  cells: LiveH3Cell[];
  totalDetections: number;
  perSensorRaw: Record<string, number>;
  perSensorHarmonized: Record<string, number>;
  harmonizedIndex: number;
} {
  const cellMap = new Map<
    string,
    { count: number; sum_frp: number; modis: number; viirs: number }
  >();

  // For harmonization: group by (cell, sat)
  const groupMap = new Map<
    string,
    { hex: string; sensor: "MODIS" | "VIIRS"; frp: number; sat: string }
  >();

  const perSensorRaw: Record<string, number> = {
    MODIS: 0,
    VIIRS: 0,
    Terra_Aqua: 0,
    SNPP: 0,
    "NOAA-20": 0,
    "NOAA-21": 0,
  };

  for (const d of dets) {
    const hex = latLngToCell(d.lat, d.lon, zoomRes);
    const isModis = d.source === "MODIS_NRT";
    const sensor = isModis ? "MODIS" : "VIIRS";

    // Map cell aggregate
    const c = cellMap.get(hex) ?? { count: 0, sum_frp: 0, modis: 0, viirs: 0 };
    c.count++;
    c.sum_frp += d.frp;
    if (isModis) c.modis++;
    else c.viirs++;
    cellMap.set(hex, c);

    // Group for harmonization
    const groupKey = `${hex}|${d.sat}`;
    const g = groupMap.get(groupKey);
    if (g) {
      g.frp += d.frp;
    } else {
      groupMap.set(groupKey, { hex, sensor, frp: d.frp, sat: d.sat });
    }

    // Counts
    perSensorRaw[sensor] = (perSensorRaw[sensor] ?? 0) + 1;
    if (isModis) perSensorRaw.Terra_Aqua++;
    else if (d.sat === "SNPP") perSensorRaw.SNPP++;
    else if (d.sat === "NOAA-20") perSensorRaw["NOAA-20"]++;
    else if (d.sat === "NOAA-21") perSensorRaw["NOAA-21"]++;
  }

  const area = HEX_AREA_KM2[zoomRes] ?? HEX_AREA_KM2[4];
  const cells: LiveH3Cell[] = [];
  for (const [hex, c] of cellMap) {
    cells.push({
      hex,
      count: c.count,
      sum_frp: Math.round(c.sum_frp * 10) / 10,
      modis_count: c.modis,
      viirs_count: c.viirs,
      density: +(c.sum_frp / area).toFixed(3),
    });
  }

  // Compute harmonized index
  // MODIS satellites: 2 (Terra, Aqua)
  // VIIRS satellites with data: count active among SNPP, NOAA-20, NOAA-21
  const modisSats = 2;
  const viirsSats = (perSensorRaw.SNPP > 0 ? 1 : 0) + (perSensorRaw["NOAA-20"] > 0 ? 1 : 0) + (perSensorRaw["NOAA-21"] > 0 ? 1 : 0) || 2;
  const totalSats = modisSats + viirsSats;

  let modisHarmFRP = 0;
  let viirsHarmFRP = 0;

  for (const g of groupMap.values()) {
    if (g.sensor === "VIIRS" && g.frp < VIIRS_FRP_CUTOFF) {
      continue; // Filter sub-threshold energy
    }
    if (g.sensor === "MODIS") {
      modisHarmFRP += g.frp;
    } else {
      viirsHarmFRP += g.frp;
    }
  }

  const perSensorHarmonized: Record<string, number> = {
    MODIS: Math.round((modisHarmFRP / modisSats) * 10) / 10,
    VIIRS: Math.round((viirsHarmFRP / viirsSats) * 10) / 10,
  };

  const harmonizedIndex = Math.round(((modisHarmFRP + viirsHarmFRP) / totalSats) * 10) / 10;

  return {
    cells,
    totalDetections: dets.length,
    perSensorRaw,
    perSensorHarmonized,
    harmonizedIndex,
  };
}

/* ---------- Route Handler ---------- */
export async function GET(req: NextRequest) {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return fallback("FIRMS_MAP_KEY not configured in .env.local");

  const params = req.nextUrl.searchParams;
  const bboxStr = params.get("bbox");
  const resParam = params.get("res");
  const isWorld = !bboxStr || bboxStr === "world";

  const zoomRes = resParam ? Number(resParam) : isWorld ? 4 : 6;

  let areaQuery = "world";
  if (!isWorld) {
    const parts = bboxStr.split(",").map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
      return NextResponse.json({ error: "bbox=west,south,east,north required" }, { status: 400 });
    }
    const [w, s, e, n] = parts;
    if (e <= w || n <= s) {
      return NextResponse.json({ error: "Invalid bbox: east must be > west, north must be > south" }, { status: 400 });
    }
    if (e - w > MAX_BBOX_DEG || n - s > MAX_BBOX_DEG) {
      return NextResponse.json({ error: `User-drawn bbox exceeds maximum ${MAX_BBOX_DEG}x${MAX_BBOX_DEG} degrees` }, { status: 400 });
    }
    areaQuery = `${w},${s},${e},${n}`;
  }

  // Cache check
  const cacheKey = `${areaQuery}|r${zoomRes}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    lruSet(cacheKey, cached.body, cached.at);
    return NextResponse.json(cached.body);
  }

  try {
    // Fetch last 24h (day range = 1) from all 4 sensors
    const sourcePromises = SOURCES.map(async (src) => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${src}/${areaQuery}/1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) {
        if (res.status === 429) throw new Error("FIRMS API rate limit reached (5,000 req / 10 min)");
        throw new Error(`${src} returned HTTP ${res.status}`);
      }
      const text = await res.text();
      if (text.includes("Invalid MAP_KEY")) {
        throw new Error("Invalid FIRMS MAP_KEY");
      }
      return parseCSV(text, src);
    });

    const results = await Promise.all(sourcePromises);
    const allDetections = results.flat();

    const agg = aggregateDetections(allDetections, zoomRes);
    const body: LiveResponse = {
      mode: "LIVE",
      timestamp: new Date().toISOString(),
      cells: agg.cells,
      total_detections: agg.totalDetections,
      per_sensor: {
        raw: agg.perSensorRaw,
        harmonized: agg.perSensorHarmonized,
      },
      harmonized_index: agg.harmonizedIndex,
    };

    lruSet(cacheKey, body);
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream FIRMS error";
    return fallback(message);
  }
}
