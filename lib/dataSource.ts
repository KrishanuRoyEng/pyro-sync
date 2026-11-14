import { latLngToCell } from "h3-js";

/* ---------- Types ---------- */
export interface H3Aggregate {
  hex: string;
  year: number;
  week: number;
  day: number;
  satellite: string;
  sum_frp: number;
  raw_count: number;
}

export interface RegionData {
  source: "NASA FIRMS archive" | "SYNTHETIC DEMO";
  regionId: string;
  aggregates: H3Aggregate[];
}

export interface DataSource {
  load(regionId: string): Promise<RegionData>;
}

/* ---------- Archive file loader ---------- */
async function loadArchiveFile(regionId: string): Promise<RegionData | null> {
  const paths = [
    `/data/regions/${regionId}.json`,
    `/data/regions/${regionId}.json.gz`,
  ];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const aggregates: H3Aggregate[] = await res.json();
      return { source: "NASA FIRMS archive", regionId, aggregates };
    } catch {
      continue;
    }
  }
  return null;
}

/* ---------- Synthetic fallback ---------- */
async function loadSynthetic(regionId: string): Promise<RegionData> {
  // Lazy-import to keep the module tree-shakeable for server bundles
  const { REGIONS, generateWeek, weeksInYear, years } = await import("./synthetic");
  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0];
  const aggregates: H3Aggregate[] = [];

  for (const year of years) {
    const nWeeks = weeksInYear(year);
    for (let w = 0; w < nWeeks; w++) {
      const dets = generateWeek(region, year, w + 1);
      // Build per-(hex, day, satellite) aggregates from raw detections
      const groups = new Map<string, { hex: string; frp: number; count: number; sat: string }>();
      for (const d of dets) {
        const hex = latLngToCell(d.lat, d.lon, 7);
        const key = `${hex}|${d.day}|${d.sat}`;
        const g = groups.get(key);
        if (g) { g.frp += d.frp; g.count++; }
        else groups.set(key, { hex, frp: d.frp, count: 1, sat: d.sat });
      }
      for (const [, g] of groups) {
        aggregates.push({
          hex: g.hex,
          year,
          week: w + 1,
          day: 0, // day-of-week collapsed in this path
          satellite: g.sat,
          sum_frp: g.frp,
          raw_count: g.count,
        });
      }
    }
  }

  return { source: "SYNTHETIC DEMO", regionId, aggregates };
}

/* ---------- Default export ---------- */
const dataSource: DataSource = {
  async load(regionId: string): Promise<RegionData> {
    const archive = await loadArchiveFile(regionId);
    if (archive) return archive;
    return loadSynthetic(regionId);
  },
};

export default dataSource;
