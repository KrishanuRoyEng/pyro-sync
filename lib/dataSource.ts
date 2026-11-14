import { cellToLatLng } from "h3-js";
import { Detection, Sensor, YEAR0, YEAR1, SATELLITES } from "./harmonizer";
import { REGIONS, generateWeek, weeksInYear, years, Region } from "./synthetic";

/* ---------- Data Types ---------- */

export interface ManifestSatellite {
  first: string;
  last: string;
  missing: [string, string][];
}

export type Manifest = Record<string, ManifestSatellite>;

export interface RegionColumnarFile {
  region: string;
  bbox: [number, number, number, number];
  res: number;
  sats: string[];
  hexes: string[];
  h: number[];
  y: number[];
  w: number[];
  d: number[];
  s: number[];
  frp: number[];
  n: number[];
}

export interface GlobalYearFile {
  year: number;
  res: number;
  families: string[];
  hexes: string[];
  h: number[];
  w: number[];
  k: number[];
  frp: number[];
  n: number[];
}

export interface TotalsFile {
  sats: string[];
  y: number[];
  w: number[];
  s: number[];
  n: number[];
  frp: number[];
}

export interface ProofPoint {
  year: number;
  raw: number;
  harmonized: number;
  rawCount: number;
  harmFRP: number;
}

export interface ProofChartData {
  points: ProofPoint[];
  hasViirs: boolean;
  baselineYearsText: string;
  rawRatio?: number;
  harmRatio?: number;
  headline: string;
}

export interface LoadedRegionData {
  source: "NASA FIRMS archive" | "SYNTHETIC DEMO";
  regionId: string;
  weeks: Detection[][][]; // [yearIndex][weekIndex] -> Detection[]
  coverageText: string;
  hasViirs: boolean;
  activeSatellitesMatrix: string[][][]; // [yearIndex][weekIndex] -> sat names
  error?: string;
}

/* ---------- Date & Manifest Helpers ---------- */

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function getWeekDateRange(y: number, w: number): { startStr: string; endStr: string } {
  const d0 = new Date(Date.UTC(y, 0, 1));
  const startDayOffset = (w - 1) * 7;
  const start = new Date(d0.getTime() + startDayOffset * 86400000);
  const endDayOffset = w === 52 ? (isLeapYear(y) ? 365 : 364) : w * 7 - 1;
  const end = new Date(d0.getTime() + endDayOffset * 86400000);
  return {
    startStr: start.toISOString().slice(0, 10),
    endStr: end.toISOString().slice(0, 10),
  };
}

export function getActiveSatellitesFromManifest(manifest: Manifest | null, y: number, w: number): string[] {
  if (!manifest || Object.keys(manifest).length === 0) {
    // Fallback if manifest is absent: use satellite timeline
    if (y === 2000 && w < 44) return [];
    return SATELLITES.filter((s) => y >= s.from).map((s) => s.id);
  }

  const { startStr, endStr } = getWeekDateRange(y, w);
  const active: string[] = [];

  for (const [sat, info] of Object.entries(manifest)) {
    if (endStr < info.first || startStr > info.last) continue;
    // Check if entire week is within a known missing range
    const isMissing = (info.missing || []).some(([mStart, mEnd]) => {
      return mStart <= startStr && mEnd >= endStr;
    });
    if (!isMissing) {
      active.push(sat);
    }
  }

  return active;
}

export function getCoverageSummary(manifest: Manifest | null): {
  sats: string[];
  firstDate: string;
  lastDate: string;
  summaryText: string;
  hasViirs: boolean;
} {
  if (!manifest || Object.keys(manifest).length === 0) {
    return {
      sats: ["Synthetic"],
      firstDate: "2000-01-01",
      lastDate: "2026-11-14",
      summaryText: "Synthetic simulation (2000–2026)",
      hasViirs: false,
    };
  }

  const sats = Object.keys(manifest);
  const hasViirs = sats.some((s) => ["SNPP", "NOAA-20", "NOAA-21"].includes(s));
  let minFirst = "9999-99-99";
  let maxLast = "0000-00-00";

  for (const info of Object.values(manifest)) {
    if (info.first && info.first < minFirst) minFirst = info.first;
    if (info.last && info.last > maxLast) maxLast = info.last;
  }

  const satNames = sats.join(", ");
  const text = `${satNames} (${minFirst.slice(0, 7)} to ${maxLast.slice(0, 7)})`;

  return {
    sats,
    firstDate: minFirst,
    lastDate: maxLast,
    summaryText: text,
    hasViirs,
  };
}

/* ---------- Gzip Fetch & Decompress Helper ---------- */

export async function fetchGzipJson<T>(url: string): Promise<T> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream is not supported by your browser");
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }
  if (!res.body) {
    throw new Error(`Empty response body for ${url}`);
  }
  const decompressed = new Response(res.body.pipeThrough(new DecompressionStream("gzip")));
  return (await decompressed.json()) as T;
}

/* ---------- Cache Singletons ---------- */

let cachedManifest: Manifest | null = null;
let cachedTotals: TotalsFile | null = null;
const cachedGlobalYears = new Map<number, GlobalYearFile>();
const cachedRegions = new Map<string, LoadedRegionData>();

/* ---------- Loader Functions ---------- */

export async function loadManifest(): Promise<Manifest | null> {
  if (cachedManifest) return cachedManifest;
  try {
    const res = await fetch("/data/manifest.json");
    if (!res.ok) return null;
    cachedManifest = await res.json();
    return cachedManifest;
  } catch {
    return null;
  }
}

export async function loadTotals(): Promise<TotalsFile | null> {
  if (cachedTotals) return cachedTotals;
  try {
    const res = await fetch("/data/global/totals.json");
    if (!res.ok) return null;
    cachedTotals = await res.json();
    return cachedTotals;
  } catch {
    return null;
  }
}

export async function loadGlobalYear(year: number): Promise<GlobalYearFile | null> {
  if (cachedGlobalYears.has(year)) return cachedGlobalYears.get(year)!;
  try {
    const data = await fetchGzipJson<GlobalYearFile>(`/data/global/${year}.json.gz`);
    cachedGlobalYears.set(year, data);
    return data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Failed to load global year file for ${year} (${errorMsg}).`);
    return null;
  }
}

/* ---------- Columnar Region Parser ---------- */

export function parseRegionColumnar(
  data: RegionColumnarFile,
  manifest: Manifest | null
): LoadedRegionData {
  const weeksGrid: Detection[][][] = years.map((y) =>
    Array.from({ length: weeksInYear(y) }, () => [])
  );
  const activeSatsGrid: string[][][] = years.map((y) =>
    Array.from({ length: weeksInYear(y) }, (_, w) =>
      getActiveSatellitesFromManifest(manifest, y, w + 1)
    )
  );

  // Pre-calculate lat/lon once for each unique hex cell
  const coords: [number, number][] = data.hexes.map((hex) => cellToLatLng(hex));

  const totalRows = data.h.length;
  for (let i = 0; i < totalRows; i++) {
    const y = data.y[i];
    const yearIdx = y - YEAR0;
    if (yearIdx < 0 || yearIdx >= years.length) continue;

    const w = data.w[i] - 1; // 0-based week index
    if (w < 0 || w >= weeksInYear(y)) continue;

    const hexIdx = data.h[i];
    const [lat, lon] = coords[hexIdx];
    const satName = data.sats[data.s[i]] ?? "Unknown";
    const sensor: Sensor = satName === "Terra" || satName === "Aqua" ? "MODIS" : "VIIRS";

    weeksGrid[yearIdx][w].push({
      lat,
      lon,
      frp: data.frp[i],
      sensor,
      sat: satName,
      day: data.d[i],
      count: data.n[i],
      hex: data.hexes[hexIdx],
    });
  }

  const cov = getCoverageSummary(manifest);

  return {
    source: "NASA FIRMS archive",
    regionId: data.region,
    weeks: weeksGrid,
    coverageText: cov.summaryText,
    hasViirs: cov.hasViirs,
    activeSatellitesMatrix: activeSatsGrid,
  };
}

/* ---------- Synthetic Fallback Generator ---------- */

function createSyntheticRegion(region: Region, manifest: Manifest | null): LoadedRegionData {
  const weeksGrid: Detection[][][] = years.map((y) =>
    Array.from({ length: weeksInYear(y) }, (_, w) => generateWeek(region, y, w + 1))
  );
  const activeSatsGrid: string[][][] = years.map((y) =>
    Array.from({ length: weeksInYear(y) }, (_, w) =>
      getActiveSatellitesFromManifest(manifest, y, w + 1)
    )
  );

  return {
    source: "SYNTHETIC DEMO",
    regionId: region.id,
    weeks: weeksGrid,
    coverageText: "SEEDED SYNTHETIC DEMO (2000–2026 simulation; not NASA data)",
    hasViirs: true, // Synthetic includes SNPP/VIIRS
    activeSatellitesMatrix: activeSatsGrid,
  };
}

/* ---------- Primary Region Loader ---------- */

export async function loadRegion(regionId: string): Promise<LoadedRegionData> {
  if (cachedRegions.has(regionId)) return cachedRegions.get(regionId)!;

  const manifest = await loadManifest();
  const regionDef = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0];

  // If World view is requested
  if (regionId === "world") {
    // For World view, we return a loaded region wrapper that can be populated
    // from global year files or totals
    const worldData = await loadWorldRegion(manifest);
    cachedRegions.set("world", worldData);
    return worldData;
  }

  // Attempt to load NASA FIRMS archive from public/data/regions/<id>.json.gz
  try {
    const data = await fetchGzipJson<RegionColumnarFile>(`/data/regions/${regionId}.json.gz`);
    const parsed = parseRegionColumnar(data, manifest);
    cachedRegions.set(regionId, parsed);
    return parsed;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Failed to load archive for region ${regionId} (${errorMsg}); falling back to synthetic.`);
    const synth = createSyntheticRegion(regionDef, manifest);
    synth.error = typeof DecompressionStream === "undefined"
      ? "Browser lacks DecompressionStream API for gzip files; fallback to SYNTHETIC DEMO."
      : `Archive file missing or unreadable (${errorMsg}); fallback to SYNTHETIC DEMO.`;
    cachedRegions.set(regionId, synth);
    return synth;
  }
}

/* ---------- World Region Loader (Aggregates Global Files) ---------- */

async function loadWorldRegion(manifest: Manifest | null): Promise<LoadedRegionData> {
  const totals = await loadTotals();
  const weeksGrid: Detection[][][] = years.map((y) =>
    Array.from({ length: weeksInYear(y) }, () => [])
  );
  const activeSatsGrid: string[][][] = years.map((y) =>
    Array.from({ length: weeksInYear(y) }, (_, w) =>
      getActiveSatellitesFromManifest(manifest, y, w + 1)
    )
  );

  if (totals) {
    // Build detection representation per (year, week, satellite) from totals.json
    for (let i = 0; i < totals.y.length; i++) {
      const y = totals.y[i];
      const yearIdx = y - YEAR0;
      if (yearIdx < 0 || yearIdx >= years.length) continue;
      const w = totals.w[i] - 1;
      if (w < 0 || w >= weeksInYear(y)) continue;

      const satName = totals.sats[totals.s[i]] ?? "Terra";
      const sensor: Sensor = satName === "Terra" || satName === "Aqua" ? "MODIS" : "VIIRS";

      weeksGrid[yearIdx][w].push({
        lat: 0,
        lon: 0,
        frp: totals.frp[i],
        sensor,
        sat: satName,
        day: 0,
        count: totals.n[i],
        hex: "global",
      });
    }

    const cov = getCoverageSummary(manifest);
    return {
      source: "NASA FIRMS archive",
      regionId: "world",
      weeks: weeksGrid,
      coverageText: cov.summaryText,
      hasViirs: cov.hasViirs,
      activeSatellitesMatrix: activeSatsGrid,
    };
  }

  // Fallback if totals missing
  const synth = createSyntheticRegion(REGIONS[0], manifest);
  synth.regionId = "world";
  return synth;
}

/* ---------- Proof Chart Calculator (from totals.json) ---------- */

export async function computeProofChartData(): Promise<ProofChartData> {
  const manifest = await loadManifest();
  const totals = await loadTotals();

  const cov = getCoverageSummary(manifest);
  const hasViirsInManifest = cov.hasViirs;

  if (!totals) {
    return {
      points: [],
      hasViirs: false,
      baselineYearsText: "2003–2011",
      headline: "Totals data loading...",
    };
  }

  // Group by year and week
  const yearsInTotals = [...new Set(totals.y)].sort((a, b) => a - b);
  const yearMap = new Map<number, { raw: number; weeks: Map<number, { frp: number; sats: Set<number> }> }>();

  for (let i = 0; i < totals.y.length; i++) {
    const y = totals.y[i];
    const w = totals.w[i];
    const s = totals.s[i];
    const n = totals.n[i];
    const frp = totals.frp[i];

    if (!yearMap.has(y)) yearMap.set(y, { raw: 0, weeks: new Map() });
    const yData = yearMap.get(y)!;
    yData.raw += n;

    if (!yData.weeks.has(w)) yData.weeks.set(w, { frp: 0, sats: new Set() });
    const wData = yData.weeks.get(w)!;
    wData.frp += frp;
    wData.sats.add(s);
  }

  // Baseline: first full years with both Terra & Aqua before VIIRS (2003–2011)
  const baselineYears = [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011].filter((y) =>
    yearMap.has(y)
  );
  let sumBaseRaw = 0;
  let sumBaseHarm = 0;

  const rawHarmByYear = new Map<number, { raw: number; harm: number }>();

  for (const y of yearsInTotals) {
    const yData = yearMap.get(y)!;
    let harm = 0;
    for (const [w, wData] of yData.weeks) {
      const activeSats = getActiveSatellitesFromManifest(manifest, y, w);
      const nSat = activeSats.length > 0 ? activeSats.length : Math.max(1, wData.sats.size);
      harm += wData.frp / nSat;
    }
    rawHarmByYear.set(y, { raw: yData.raw, harm });

    if (baselineYears.includes(y)) {
      sumBaseRaw += yData.raw;
      sumBaseHarm += harm;
    }
  }

  const baseRaw = baselineYears.length > 0 ? sumBaseRaw / baselineYears.length : 1;
  const baseHarm = baselineYears.length > 0 ? sumBaseHarm / baselineYears.length : 1;

  const points: ProofPoint[] = yearsInTotals.map((y) => {
    const data = rawHarmByYear.get(y)!;
    return {
      year: y,
      raw: +(data.raw / baseRaw).toFixed(2),
      harmonized: +(data.harm / baseHarm).toFixed(2),
      rawCount: data.raw,
      harmFRP: Math.round(data.harm),
    };
  });

  // Calculate computed headline strictly from actual numbers
  let headline = "";
  let rawRatio: number | undefined;
  let harmRatio: number | undefined;

  if (hasViirsInManifest && yearMap.has(2011) && yearMap.has(2013)) {
    // VIIRS exists: compare pre-VIIRS (2009-2011) to post-VIIRS (2013-2015)
    const preYears = [2009, 2010, 2011].filter((y) => rawHarmByYear.has(y));
    const postYears = [2012, 2013].filter((y) => rawHarmByYear.has(y));
    const rawPre = preYears.reduce((a, y) => a + rawHarmByYear.get(y)!.raw, 0) / preYears.length;
    const rawPost = postYears.reduce((a, y) => a + rawHarmByYear.get(y)!.raw, 0) / postYears.length;
    const harmPre = preYears.reduce((a, y) => a + rawHarmByYear.get(y)!.harm, 0) / preYears.length;
    const harmPost = postYears.reduce((a, y) => a + rawHarmByYear.get(y)!.harm, 0) / postYears.length;

    rawRatio = +(rawPost / rawPre).toFixed(1);
    harmRatio = +(harmPost / harmPre).toFixed(1);
    headline = `Raw counts rose ${rawRatio}× when VIIRS arrived; the harmonized index rose ${harmRatio}×.`;
  } else {
    // VIIRS absent from archive (only MODIS Terra + Aqua present)
    const totalDetections = points.reduce((acc, p) => acc + p.rawCount, 0);
    const mDets = (totalDetections / 1_000_000).toFixed(1);
    headline = `NASA archive loaded: ${mDets}M MODIS detections (2000–2017); VIIRS archive pending download.`;
  }

  return {
    points,
    hasViirs: hasViirsInManifest,
    baselineYearsText: "2003–2011 mean = 1.0",
    rawRatio,
    harmRatio,
    headline,
  };
}

/* ---------- Default Export ---------- */
const dataSource = {
  fetchGzipJson,
  loadManifest,
  loadRegion,
  loadGlobalYear,
  loadTotals,
  computeProofChartData,
  getActiveSatellitesFromManifest,
  getCoverageSummary,
  getWeekDateRange,
};

export default dataSource;
