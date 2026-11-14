import { Detection, satellitesActive, YEAR0, YEAR1, LAST_WEEK_2026 } from "./harmonizer";

export interface Region {
  id: string; name: string; center: [number, number]; zoom: number; spread: number;
  base: number; frpMu: number; frpSigma: number; season: (w: number) => number;
  flare?: [number, number];
}
const g = (w: number, c: number, s: number) => Math.exp(-((w - c) ** 2) / (2 * s * s));

export const REGIONS: Region[] = [
  { id: "punjab", name: "North India (Punjab/Haryana)", center: [30.6, 75.4], zoom: 6, spread: 1.6, base: 90,
    frpMu: 0.7, frpSigma: 0.55, season: (w) => 0.04 + g(w, 18, 1.6) * 0.8 + g(w, 44, 2.2) * 1.6, flare: [30.9, 75.9] },
  { id: "california", name: "California (Sierra Nevada / North)", center: [38.8, -121.0], zoom: 6, spread: 1.4, base: 40,
    frpMu: 2.4, frpSigma: 0.9, season: (w) => 0.05 + g(w, 33, 6) * 1.7 },
  { id: "amazon", name: "Amazon (Mato Grosso / Rondônia)", center: [-11.5, -58.0], zoom: 5, spread: 3.2, base: 120,
    frpMu: 1.5, frpSigma: 0.8, season: (w) => 0.08 + g(w, 35, 5) * 1.6, flare: [-10.4, -61.9] },
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

export function yearFactor(region: Region, y: number) {
  const r = rng(hash(region.id) + y * 977);
  let f = 0.75 + 0.5 * r();
  if (region.id === "california") f *= 1 + (y - YEAR0) * 0.025;
  if ((region.id === "california" && [2018, 2020, 2021].includes(y)) ||
      (region.id === "amazon" && [2005, 2010, 2019, 2024].includes(y)) ||
      (region.id === "punjab" && [2012, 2016].includes(y))) f *= 2.4;
  return f;
}

/** Synthetic stand-in for FIRMS archives: shared true fire events, observed per sensor. */
export function generateWeek(region: Region, year: number, week: number): Detection[] {
  // MODIS Terra observations start Nov 2000 (week 44). Earlier weeks in 2000 have no active satellites.
  if (year === 2000 && week < 44) return [];
  const r = rng((hash(region.id) ^ Math.imul(year * 100 + week, 2654435761)) >>> 0);
  const n = Math.round(region.base * region.season(week) * yearFactor(region, year) * (0.7 + 0.6 * r()));
  const clusters = Array.from({ length: 6 }, (_, i) => {
    const c = rng(hash(region.id) + i * 31);
    return [region.center[0] + (c() - 0.5) * region.spread * 2, region.center[1] + (c() - 0.5) * region.spread * 2];
  });
  const sats = satellitesActive(year);
  const out: Detection[] = [];
  const observe = (lat: number, lon: number, frp: number, day: number) => {
    for (const s of sats) {
      if (r() > 0.8) continue;
      if (s.sensor === "MODIS") {
        if (frp >= 2.5) out.push({ lat, lon, frp, sensor: "MODIS", sat: s.id, day });
      } else if (frp >= 0.4) {
        const k = frp < 1.5 ? 1 : Math.min(8, 1 + Math.round(frp / 1.2));
        for (let i = 0; i < k; i++)
          out.push({ lat: lat + (r() - 0.5) * 0.006, lon: lon + (r() - 0.5) * 0.006, frp: frp / k, sensor: "VIIRS", sat: s.id, day });
      }
    }
  };
  for (let i = 0; i < n; i++) {
    const c = clusters[Math.floor(r() * clusters.length)];
    observe(c[0] + normal(r) * 0.25, c[1] + normal(r) * 0.25, Math.exp(region.frpMu + region.frpSigma * normal(r)), Math.floor(r() * 7));
  }
  if (region.flare) for (let d = 0; d < 7; d++) observe(region.flare[0], region.flare[1], 9 + r() * 3, d);
  return out;
}

export const weeksInYear = (y: number) => (y === YEAR1 ? LAST_WEEK_2026 : 52);
export const years = Array.from({ length: YEAR1 - YEAR0 + 1 }, (_, i) => YEAR0 + i);
