/**
 * Colorblind-safe thermal ramp.
 * Goes from dark (no fire) through amber to white-hot.
 * Uses a stepped palette avoiding red-green ambiguity.
 * Stops: dark bg -> deep amber -> orange -> warm white
 */
const STOPS = [
  [43, 45, 66],    // #2B2D42  dark slate (background / no data)
  [217, 119, 6],   // #D97706  amber (low)
  [234, 88, 12],   // #EA580C  orange (medium)
  [251, 191, 36],  // #FBBF24  yellow (high)
  [243, 244, 246], // #F3F4F6  near-white (extreme)
];

/** t in [0,1] -> [r,g,b] across the flat thermal ramp (linear interpolation, no CSS gradients). */
export function ramp(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
  return [0, 1, 2].map((k) => Math.round(STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f)) as [number, number, number];
}

/** Returns CSS color string for a [0,1] value. */
export function rampCSS(t: number): string {
  const [r, g, b] = ramp(t);
  return `rgb(${r},${g},${b})`;
}

/** The ramp stops as CSS colors for legend rendering. */
export const RAMP_STOPS = STOPS.map(([r, g, b]) => `rgb(${r},${g},${b})`);
export const RAMP_LABELS = ["None", "Low", "Medium", "High", "Extreme"];
