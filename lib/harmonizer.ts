import { latLngToCell, gridDisk } from "h3-js";

export type Sensor = "MODIS" | "VIIRS";
export interface Detection {
  lat: number;
  lon: number;
  frp: number;
  sensor: Sensor;
  sat: string;
  day: number;
  count?: number;
  hex?: string;
}
export interface Params { res: 5 | 6 | 7; viirsCutoff: number; normalize: boolean; harmonize: boolean }
export interface HexCell { hex: string; count: number; frp: number; density: number }
export interface WeekStat { raw: number; index: number; frp: number; cells: number }

export const HEX_AREA_KM2: Record<number, number> = { 3: 12393, 4: 1770, 5: 252.9, 6: 36.13, 7: 5.161 };
export const YEAR0 = 2000;
export const YEAR1 = 2026;
export const LAST_WEEK_2026 = 45;

export const SATELLITES: { id: string; sensor: Sensor; from: number; fromDate: string }[] = [
  { id: "Terra", sensor: "MODIS", from: 2000, fromDate: "2000-11-01" },
  { id: "Aqua", sensor: "MODIS", from: 2002, fromDate: "2002-07-04" },
  { id: "SNPP", sensor: "VIIRS", from: 2012, fromDate: "2012-01-20" },
  { id: "NOAA-20", sensor: "VIIRS", from: 2018, fromDate: "2018-01-05" },
  { id: "NOAA-21", sensor: "VIIRS", from: 2024, fromDate: "2024-01-17" },
];
export const satellitesActive = (year: number, week?: number) => {
  if (week !== undefined && year === 2000 && week < 44) {
    return []; // MODIS Terra observations start Nov 2000 (week 44)
  }
  return SATELLITES.filter((s) => year >= s.from);
};

/**
 * Harmonize one week of detections.
 * 1. Snap points to H3 cells and group by (cell, day, satellite): a fire split into several
 *    375 m VIIRS pixels collapses to one areal unit, like a single 1 km MODIS pixel.
 * 2. Apply the VIIRS sensitivity cutoff to the cell total (not single pixels), so split
 *    energy is kept and VIIRS matches MODIS's minimum detectable fire.
 * 3. Sum FRP and divide by active satellites (overpass effort).
 * harmonize=false returns the raw point count.
 */
export function harmonizeWeek(dets: Detection[], nSat: number, p: Params): { stat: WeekStat; hexes: HexCell[] } {
  const groups = new Map<string, { hex: string; sensor: Sensor; frp: number; count: number }>();
  for (const d of dets) {
    const hex = d.hex && p.res === 7 ? d.hex : latLngToCell(d.lat, d.lon, p.res);
    const key = `${hex}|${d.day}|${d.sat}`;
    const g = groups.get(key);
    const cnt = d.count ?? 1;
    if (g) {
      g.frp += d.frp;
      g.count += cnt;
    } else {
      groups.set(key, { hex, sensor: d.sensor, frp: d.frp, count: cnt });
    }
  }
  const div = p.normalize ? Math.max(1, nSat) : 1;
  const perHex = new Map<string, { count: number; frp: number }>();
  let frp = 0, cells = 0;
  let totalRaw = 0;
  for (const g of groups.values()) {
    totalRaw += g.count;
    if (p.harmonize && g.sensor === "VIIRS" && g.frp < p.viirsCutoff) continue;
    frp += g.frp; cells++;
    const h = perHex.get(g.hex) ?? { count: 0, frp: 0 };
    h.count += (p.harmonize ? 1 : g.count);
    h.frp += g.frp;
    perHex.set(g.hex, h);
  }
  const area = HEX_AREA_KM2[p.res];
  const hexes: HexCell[] = [...perHex].map(([hex, h]) => ({ hex, count: h.count / div, frp: h.frp / div, density: h.frp / div / area }));
  const raw = totalRaw;
  const stat: WeekStat = p.harmonize ? { raw, index: frp / div, frp, cells } : { raw, index: raw / div, frp: 0, cells: raw };
  return { stat, hexes };
}

/** Z-score each week-of-year across years. matrix[yearIdx][weekIdx], null = no data. */
export function zScores(matrix: (number | null)[][]): (number | null)[][] {
  const weeks = matrix[0]?.length ?? 0;
  const out = matrix.map((r) => r.map(() => null as number | null));
  for (let w = 0; w < weeks; w++) {
    const vals = matrix.map((r) => r[w]).filter((v): v is number => v !== null);
    if (vals.length < 3) continue;
    const mu = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / (vals.length - 1));
    matrix.forEach((r, y) => { const v = r[w]; if (v !== null) out[y][w] = sd > 1e-9 ? (v - mu) / sd : 0; });
  }
  return out;
}

export type Regime = "AGRI-BURN" | "WILDFIRE-FRONT" | "STATIC-FLARE" | "BACKGROUND";

export interface RegimeDetails {
  regime: Regime;
  contiguityPct: number;
  meanFrp: number;
  totalFrp: number;
  cellCount: number;
  description: string;
}

/** Deterministic rule-based tagging of a week's hex set into physical fire regimes. */
export function classifyRegime(hexes: HexCell[]): Regime {
  if (!hexes.length) return "BACKGROUND";
  if (hexes.length === 1 && hexes[0].count >= 1) return "STATIC-FLARE";
  const set = new Set(hexes.map((h) => h.hex));
  const contiguous = hexes.filter((h) => gridDisk(h.hex, 1).some((n) => n !== h.hex && set.has(n))).length;
  const contig = hexes.length > 0 ? contiguous / hexes.length : 0;
  const meanFrp = hexes.reduce((a, h) => a + h.frp, 0) / hexes.length;
  if (meanFrp > 40 && contig > 0.5) return "WILDFIRE-FRONT";
  return meanFrp < 15 ? "AGRI-BURN" : contig > 0.5 ? "WILDFIRE-FRONT" : "AGRI-BURN";
}

/** Detailed diagnostic breakdown for the regime classification with spatial metrics. */
export function classifyRegimeDetails(hexes: HexCell[]): RegimeDetails {
  const regime = classifyRegime(hexes);
  if (!hexes.length) {
    return {
      regime: "BACKGROUND",
      contiguityPct: 0,
      meanFrp: 0,
      totalFrp: 0,
      cellCount: 0,
      description: "Nominal thermal baseline — zero sustained active fire clusters.",
    };
  }
  const set = new Set(hexes.map((h) => h.hex));
  const contiguous = hexes.filter((h) => gridDisk(h.hex, 1).some((n) => n !== h.hex && set.has(n))).length;
  const contig = hexes.length > 0 ? (contiguous / hexes.length) * 100 : 0;
  const totalFrp = hexes.reduce((a, h) => a + h.frp, 0);
  const meanFrp = totalFrp / hexes.length;

  let description = "";
  switch (regime) {
    case "WILDFIRE-FRONT":
      description = `High-intensity coherent front (${contig.toFixed(0)}% contiguous hexes, mean ${meanFrp.toFixed(1)} MW/cell).`;
      break;
    case "AGRI-BURN":
      description = `Dispersed agricultural burning (${contig.toFixed(0)}% contiguous, mean ${meanFrp.toFixed(1)} MW/cell).`;
      break;
    case "STATIC-FLARE":
      description = `Isolated point source / gas flare (${hexes[0].count} persistent detections in 1 cell).`;
      break;
    case "BACKGROUND":
    default:
      description = "Nominal thermal baseline.";
      break;
  }

  return {
    regime,
    contiguityPct: contig,
    meanFrp,
    totalFrp,
    cellCount: hexes.length,
    description,
  };
}
