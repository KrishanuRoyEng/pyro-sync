import { describe, it, expect } from "vitest";
import { harmonizeWeek, zScores, satellitesActive, classifyRegime, Params, HexCell, SATELLITES } from "../lib/harmonizer";
import { REGIONS, generateWeek } from "../lib/synthetic";

const P: Params = { res: 6, viirsCutoff: 2, normalize: true, harmonize: true };
const PRAW: Params = { res: 6, viirsCutoff: 2, normalize: false, harmonize: false };

/* Helper: compute mean harmonized index over a range of weeks and years */
const meanIndex = (y0: number, y1: number, p: Params, regionIdx = 1) => {
  let t = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let w = 15; w <= 25; w++) {
      t += harmonizeWeek(generateWeek(REGIONS[regionIdx], y, w + 12), satellitesActive(y).length, p).stat.index;
      n++;
    }
  }
  return t / n;
};

/* Helper: compute raw count over a range */
const meanRawCount = (y0: number, y1: number, regionIdx = 1) => {
  let t = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let w = 15; w <= 25; w++) {
      t += generateWeek(REGIONS[regionIdx], y, w + 12).length;
      n++;
    }
  }
  return t / n;
};

describe("harmonization", () => {
  it("raw counts step up at VIIRS launch much more than the harmonized index", () => {
    const raw = meanIndex(2013, 2015, PRAW) / meanIndex(2009, 2011, PRAW);
    const harm = meanIndex(2013, 2015, P) / meanIndex(2009, 2011, P);
    expect(raw).toBeGreaterThan(2);
    expect(harm).toBeLessThan(raw * 0.6);
  });

  it("zScores flags an outlier", () => {
    expect(zScores([[1], [1], [1], [1], [1], [10]])[5][0]).toBeGreaterThan(2);
  });

  it("NOAA-21 starts 2024, not 2023", () => {
    const noaa21 = SATELLITES.find((s) => s.id === "NOAA-21");
    expect(noaa21).toBeDefined();
    expect(noaa21!.from).toBe(2024);
  });

  it("MODIS Terra starts 2000", () => {
    const terra = SATELLITES.find((s) => s.id === "Terra");
    expect(terra).toBeDefined();
    expect(terra!.from).toBe(2000);
  });
});

describe("MODIS vs VIIRS harmonization agreement", () => {
  /*
   * Spec check: with the harmonizer active and cutoff at 0 (pure H3 grouping),
   * a MODIS week and a VIIRS week that have been scaled to identical total FRP
   * should produce harmonized indices within ±8%.
   * The cutoff=0 isolates the pixel-fragmentation correction from the
   * sensitivity-floor correction, which is tested separately.
   */
  it("MODIS week and VIIRS week with identical total FRP agree within ±8% in harmonized index (cutoff=0)", () => {
    const region = REGIONS[0]; // Punjab — strong fire signal
    const MODIS_YEAR = 2008;   // Only Terra + Aqua (MODIS)
    const VIIRS_YEAR = 2015;   // MODIS + VIIRS (SNPP)
    const WEEK = 44;           // Fire season in Punjab

    const modisWeekDets = generateWeek(region, MODIS_YEAR, WEEK);
    const viirsWeekDets = generateWeek(region, VIIRS_YEAR, WEEK);

    // Raw VIIRS counts should be several times higher (pixel fragmentation)
    expect(viirsWeekDets.length).toBeGreaterThan(modisWeekDets.length * 2);

    // Scale VIIRS FRP to match MODIS total
    const modisTotalFRP = modisWeekDets.reduce((s, d) => s + d.frp, 0);
    const viirsTotalFRP = viirsWeekDets.reduce((s, d) => s + d.frp, 0);
    const scale = modisTotalFRP / viirsTotalFRP;
    const scaledViirsDets = viirsWeekDets.map((d) => ({ ...d, frp: d.frp * scale }));

    // Use cutoff=0 and normalize=false to isolate pure H3 grouping effect
    const P_PURE: Params = { res: 6, viirsCutoff: 0, normalize: false, harmonize: true };

    const modisResult = harmonizeWeek(modisWeekDets, satellitesActive(MODIS_YEAR).length, P_PURE);
    const viirsResult = harmonizeWeek(scaledViirsDets, satellitesActive(VIIRS_YEAR).length, P_PURE);

    const modisIndex = modisResult.stat.index;
    const viirsIndex = viirsResult.stat.index;

    // H3 grouping should make the indices agree within ±8%
    expect(modisIndex).toBeGreaterThan(0);
    expect(viirsIndex).toBeGreaterThan(0);
    const ratio = viirsIndex / modisIndex;
    expect(ratio).toBeGreaterThan(0.92);
    expect(ratio).toBeLessThan(1.08);
  });

  it("with the VIIRS FRP cutoff, harmonized ratio compresses much more than raw ratio", () => {
    // Across multiple fire-season weeks, the harmonized index should show
    // much less discontinuity at the VIIRS launch (2012) than raw counts.
    const rawBefore = meanRawCount(2009, 2011, 0);
    const rawAfter = meanRawCount(2013, 2015, 0);
    const harmBefore = meanIndex(2009, 2011, P, 0);
    const harmAfter = meanIndex(2013, 2015, P, 0);

    const rawRatio = rawAfter / rawBefore;
    const harmRatio = harmAfter / harmBefore;

    // Raw counts jump >2× at VIIRS launch
    expect(rawRatio).toBeGreaterThan(2);
    // Harmonized index jump is less than 60% of the raw jump
    expect(harmRatio).toBeLessThan(rawRatio * 0.6);
  });

  it("raw VIIRS counts are several times higher than raw MODIS counts for same region/week", () => {
    const region = REGIONS[0]; // Punjab
    const WEEK = 44;

    // MODIS-only era
    const modis2008 = generateWeek(region, 2008, WEEK);
    const modisCount = modis2008.filter((d) => d.sensor === "MODIS").length;
    const viirsCount2008 = modis2008.filter((d) => d.sensor === "VIIRS").length;
    expect(viirsCount2008).toBe(0); // No VIIRS in 2008

    // VIIRS era
    const viirs2015 = generateWeek(region, 2015, WEEK);
    const rawViirs = viirs2015.filter((d) => d.sensor === "VIIRS").length;
    const rawModis = viirs2015.filter((d) => d.sensor === "MODIS").length;

    // VIIRS raw should be several times higher
    expect(rawViirs).toBeGreaterThan(rawModis * 2);
  });
});

describe("Z-score computation", () => {
  it("returns null for insufficient data (< 3 years)", () => {
    const result = zScores([[5], [10]]);
    expect(result[0][0]).toBeNull();
    expect(result[1][0]).toBeNull();
  });

  it("returns 0 for constant values", () => {
    const result = zScores([[7], [7], [7], [7]]);
    expect(result[0][0]).toBe(0);
    expect(result[3][0]).toBe(0);
  });

  it("correctly identifies positive and negative anomalies", () => {
    const data = [[1], [1], [1], [1], [1], [10], [1], [1]];
    const result = zScores(data);
    // The outlier (10) should have a high positive z-score
    expect(result[5][0]).toBeGreaterThan(2);
    // Normal values should have slightly negative z-scores
    expect(result[0][0]!).toBeLessThan(0);
  });

  it("preserves null entries (no data weeks)", () => {
    const result = zScores([[1, null], [2, null], [3, null], [4, null]]);
    expect(result[0][1]).toBeNull();
    expect(result[0][0]).not.toBeNull();
  });
});

describe("regime classifier", () => {
  it("classifies empty hex set as BACKGROUND", () => {
    expect(classifyRegime([])).toBe("BACKGROUND");
  });

  it("classifies single persistent hex as STATIC-FLARE", () => {
    const hexes: HexCell[] = [{ hex: "862a10680ffffff", count: 5, frp: 45, density: 8.7 }];
    expect(classifyRegime(hexes)).toBe("STATIC-FLARE");
  });

  it("classifies low-FRP scattered hexes as AGRI-BURN", () => {
    // Low mean FRP, non-contiguous
    const hexes: HexCell[] = [
      { hex: "862a10680ffffff", count: 2, frp: 5, density: 1 },
      { hex: "862a10688ffffff", count: 1, frp: 3, density: 0.6 },
      { hex: "862b10680ffffff", count: 1, frp: 4, density: 0.8 },
    ];
    expect(classifyRegime(hexes)).toBe("AGRI-BURN");
  });

  it("classifies high-FRP contiguous hexes as WILDFIRE-FRONT", () => {
    // Use gridDisk to create contiguous hexes
    const { gridDisk } = require("h3-js");
    const center = "862a10680ffffff";
    const neighbors: string[] = gridDisk(center, 1);
    const hexes: HexCell[] = neighbors.map((hex: string) => ({
      hex, count: 3, frp: 80, density: 15.5,
    }));
    expect(classifyRegime(hexes)).toBe("WILDFIRE-FRONT");
  });
});
