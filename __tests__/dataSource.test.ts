import { describe, it, expect } from "vitest";
import {
  parseRegionColumnar,
  getActiveSatellitesFromManifest,
  getCoverageSummary,
  getWeekDateRange,
  RegionColumnarFile,
  Manifest,
} from "../lib/dataSource";
import { harmonizeWeek, Params, Detection } from "../lib/harmonizer";

describe("dataSource parsing & manifest coverage", () => {
  const tinyManifest: Manifest = {
    Terra: {
      first: "2000-11-01",
      last: "2017-11-30",
      missing: [["2013-12-01", "2016-11-30"]],
    },
    Aqua: {
      first: "2002-07-04",
      last: "2017-11-30",
      missing: [["2013-12-01", "2016-11-30"]],
    },
  };

  it("determines active satellites accurately from manifest dates and gaps", () => {
    // 2000 W10: Terra has not launched yet (starts Nov 2000)
    expect(getActiveSatellitesFromManifest(tinyManifest, 2000, 10)).toEqual([]);

    // 2000 W46: Terra is active
    expect(getActiveSatellitesFromManifest(tinyManifest, 2000, 46)).toEqual(["Terra"]);

    // 2002 W10: Terra active, Aqua not launched yet (starts July 2002)
    expect(getActiveSatellitesFromManifest(tinyManifest, 2002, 10)).toEqual(["Terra"]);

    // 2003 W20: Both Terra and Aqua active
    expect(getActiveSatellitesFromManifest(tinyManifest, 2003, 20)).toEqual(["Terra", "Aqua"]);

    // 2014 W20: NASA archive gap (both Terra and Aqua missing)
    expect(getActiveSatellitesFromManifest(tinyManifest, 2014, 20)).toEqual([]);

    // 2017 W20: Both Terra and Aqua active
    expect(getActiveSatellitesFromManifest(tinyManifest, 2017, 20)).toEqual(["Terra", "Aqua"]);

    // 2020: Past end of archive
    expect(getActiveSatellitesFromManifest(tinyManifest, 2020, 20)).toEqual([]);
  });

  it("computes coverage summary accurately without claiming unverified coverage", () => {
    const summary = getCoverageSummary(tinyManifest);
    expect(summary.sats).toEqual(["Terra", "Aqua"]);
    expect(summary.firstDate).toBe("2000-11-01");
    expect(summary.lastDate).toBe("2017-11-30");
    expect(summary.hasViirs).toBe(false);
  });

  it("parses columnar region JSON into Detection objects", () => {
    // Tiny fixture matching the public/data/regions schema
    const tinyFixture: RegionColumnarFile = {
      region: "test_region",
      bbox: [75.0, 30.0, 76.0, 31.0],
      res: 7,
      sats: ["Terra", "Aqua", "SNPP"],
      hexes: ["873d10010ffffff", "873d10012ffffff"],
      h: [0, 1],
      y: [2005, 2005],
      w: [15, 15],
      d: [2, 4],
      s: [0, 1],
      frp: [45.2, 88.6],
      n: [3, 7],
    };

    const parsed = parseRegionColumnar(tinyFixture, tinyManifest);
    expect(parsed.source).toBe("NASA FIRMS archive");
    expect(parsed.regionId).toBe("test_region");

    const yearIdx = 2005 - 2000;
    const weekIdx = 15 - 1;
    const dets = parsed.weeks[yearIdx][weekIdx];

    expect(dets.length).toBe(2);
    expect(dets[0].hex).toBe("873d10010ffffff");
    expect(dets[0].frp).toBe(45.2);
    expect(dets[0].count).toBe(3);
    expect(dets[0].sat).toBe("Terra");
    expect(dets[0].sensor).toBe("MODIS");
    expect(dets[0].lat).toBeCloseTo(30.57, 1);
    expect(dets[0].lon).toBeCloseTo(77.49, 1);

    expect(dets[1].hex).toBe("873d10012ffffff");
    expect(dets[1].frp).toBe(88.6);
    expect(dets[1].count).toBe(7);
    expect(dets[1].sat).toBe("Aqua");
    expect(dets[1].sensor).toBe("MODIS");
  });

  it("computes week date ranges accurately", () => {
    const w1 = getWeekDateRange(2020, 1);
    expect(w1.startStr).toBe("2020-01-01");
    expect(w1.endStr).toBe("2020-01-07");

    const w52Leap = getWeekDateRange(2020, 52);
    expect(w52Leap.endStr).toBe("2020-12-31");
  });
});

describe("Harmonization 8% equal-energy check", () => {
  it("MODIS and VIIRS with identical total FRP agree within ±8% in harmonized index while raw VIIRS counts are several times higher", () => {
    // Simulate a fire event in a cluster of H3 res 7 cells
    // MODIS (1 km pixel): observes 4 distinct fires, 1 detection each, total FRP = 100 MW
    const modisDets: Detection[] = [
      { lat: 30.60, lon: 75.40, frp: 25.0, sensor: "MODIS", sat: "Terra", day: 1, count: 1 },
      { lat: 30.62, lon: 75.42, frp: 25.0, sensor: "MODIS", sat: "Terra", day: 1, count: 1 },
      { lat: 30.65, lon: 75.45, frp: 25.0, sensor: "MODIS", sat: "Terra", day: 2, count: 1 },
      { lat: 30.68, lon: 75.48, frp: 25.0, sensor: "MODIS", sat: "Terra", day: 2, count: 1 },
    ];

    // VIIRS (375 m pixel): observes the exact same 4 fire events, but each fire is split into
    // 5 sub-pixel detections (20 detections total), each with 5.0 MW (total FRP = 100 MW)
    const viirsDets: Detection[] = [];
    for (const m of modisDets) {
      const splitCount = 5;
      for (let i = 0; i < splitCount; i++) {
        viirsDets.push({
          lat: m.lat + (i - 2) * 0.002, // within the same H3 res 6/7 cell
          lon: m.lon + (i - 2) * 0.002,
          frp: m.frp / splitCount,      // split energy
          sensor: "VIIRS",
          sat: "SNPP",
          day: m.day,
          count: 1,
        });
      }
    }

    // 1. Raw counts: VIIRS has 5× more raw detections
    expect(viirsDets.length).toBe(20);
    expect(modisDets.length).toBe(4);
    expect(viirsDets.length / modisDets.length).toBe(5.0);

    // 2. Both sets have identical total FRP
    const modisTotalFRP = modisDets.reduce((acc, d) => acc + d.frp, 0);
    const viirsTotalFRP = viirsDets.reduce((acc, d) => acc + d.frp, 0);
    expect(modisTotalFRP).toBe(100.0);
    expect(viirsTotalFRP).toBe(100.0);

    // 3. Harmonize both: 1 satellite each, cutoff 2 MW
    const params: Params = { res: 6, viirsCutoff: 2.0, normalize: true, harmonize: true };
    const modisHarm = harmonizeWeek(modisDets, 1, params);
    const viirsHarm = harmonizeWeek(viirsDets, 1, params);

    // The harmonized index should agree within ±8% (ratio between 0.92 and 1.08)
    const ratio = viirsHarm.stat.index / modisHarm.stat.index;
    expect(ratio).toBeGreaterThanOrEqual(0.92);
    expect(ratio).toBeLessThanOrEqual(1.08);

    // Furthermore, raw stats reflect the disparity while index reflects agreement
    expect(viirsHarm.stat.raw).toBe(20);
    expect(modisHarm.stat.raw).toBe(4);
    expect(Math.abs(viirsHarm.stat.index - modisHarm.stat.index)).toBeLessThanOrEqual(8.0);
  });
});
