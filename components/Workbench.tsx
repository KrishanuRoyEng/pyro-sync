"use client";
import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  classifyRegime,
  harmonizeWeek,
  HexCell,
  Params,
  YEAR0,
  YEAR1,
  zScores,
  HEX_AREA_KM2,
} from "@/lib/harmonizer";
import { REGIONS as BASE_REGIONS, weeksInYear, years, Region } from "@/lib/synthetic";
import dataSource, {
  LoadedRegionData,
  ProofChartData,
  getWeekDateRange,
  GlobalYearFile,
} from "@/lib/dataSource";
import { gridDisk, latLngToCell } from "h3-js";
import BurningCalendarMatrix from "./BurningCalendarMatrix";
import HarmonizationProofChart from "./HarmonizationProofChart";

const MapWorkbench = dynamic(() => import("./MapWorkbench"), { ssr: false });

/* ---------- Region presets (Punjab, California, Amazon, World) ---------- */
export const PRESETS: Region[] = [
  ...BASE_REGIONS,
  {
    id: "world",
    name: "World View (Global)",
    center: [20, 0],
    zoom: 2,
    spread: 180,
    base: 1000,
    frpMu: 1.5,
    frpSigma: 0.8,
    season: () => 1.0,
  },
];

/* ---------- Live response types ---------- */
interface LiveResponseData {
  mode: "LIVE" | "CACHED ARCHIVE MODE";
  timestamp?: string;
  reason?: string;
  cells: Array<{
    hex: string;
    count: number;
    sum_frp: number;
    modis_count: number;
    viirs_count: number;
    density: number;
  }>;
  total_detections: number;
  per_sensor: {
    raw: Record<string, number>;
    harmonized: Record<string, number>;
  };
  harmonized_index: number;
}

export default function Workbench() {
  const [ri, setRi] = useState(0); // Region preset index (0: Punjab, 1: California, 2: Amazon, 3: World)
  const [harmonize, setHarmonize] = useState(true);
  const [res, setRes] = useState<5 | 6 | 7>(6);
  const [cutoff, setCutoff] = useState(2);
  const [normalize, setNormalize] = useState(true);
  const [zThr, setZThr] = useState(2);
  const [onlyAnom, setOnlyAnom] = useState(false);
  const [sel, setSel] = useState({ y: 2010 - YEAR0, w: 43 }); // Default: 2010 Week 44 (fire season)
  const [hex, setHex] = useState<string | null>(null);

  // Live mode state
  const [liveMode, setLiveMode] = useState(false);
  const [liveData, setLiveData] = useState<LiveResponseData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Region archive state
  const [regionData, setRegionData] = useState<LoadedRegionData | null>(null);
  const [loadingRegion, setLoadingRegion] = useState(true);
  const [proofData, setProofData] = useState<ProofChartData | null>(null);

  // Global lazy-loaded year file for World preset
  const [globalYearData, setGlobalYearData] = useState<GlobalYearFile | null>(null);

  // Glossary drawer state
  const [showGlossary, setShowGlossary] = useState(false);

  // Demo tour active step (null = normal, 1 = The Problem, 2 = Harmonize, 3 = Anomaly)
  const [demoStep, setDemoStep] = useState<number | null>(null);

  const dCutoff = useDeferredValue(cutoff);
  const region = PRESETS[ri];
  const selectedYear = YEAR0 + sel.y;

  /* ---------- Load Region Data & Totals Proof Data ---------- */
  useEffect(() => {
    let cancelled = false;
    setLoadingRegion(true);

    Promise.all([dataSource.loadRegion(region.id), dataSource.computeProofChartData()]).then(
      ([rData, pData]) => {
        if (!cancelled) {
          setRegionData(rData);
          setProofData(pData);
          setLoadingRegion(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [region.id]);

  /* ---------- Lazy-load global file when in World preset ---------- */
  useEffect(() => {
    if (region.id !== "world") return;
    let cancelled = false;
    dataSource.loadGlobalYear(selectedYear).then((gData) => {
      if (!cancelled) setGlobalYearData(gData);
    });
    return () => {
      cancelled = true;
    };
  }, [region.id, selectedYear]);

  /* ---------- Fetch Live Data ---------- */
  useEffect(() => {
    if (!liveMode) {
      setLiveData(null);
      setLiveError(null);
      return;
    }
    let cancelled = false;
    const fetchLive = async () => {
      setLiveLoading(true);
      setLiveError(null);
      try {
        const res = await fetch("/api/firms/live?res=4");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: LiveResponseData = await res.json();
        if (!cancelled) {
          setLiveData(data);
          if (data.mode === "CACHED ARCHIVE MODE") {
            setLiveError(data.reason ?? "Upstream unavailable");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLiveError(err instanceof Error ? err.message : "Live stream connection failed");
          setLiveData(null);
        }
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveMode]);

  /* ---------- Calendar Matrix & Detections Grid ---------- */
  const params: Params = { res, viirsCutoff: dCutoff, normalize, harmonize: true };
  const scope = useMemo(() => (hex ? new Set(gridDisk(hex, 2)) : null), [hex]);

  const grid = useMemo(() => {
    const rawM: (number | null)[][] = [];
    const harmM: (number | null)[][] = [];

    if (!regionData) {
      years.forEach(() => {
        rawM.push(Array.from({ length: 52 }, () => null));
        harmM.push(Array.from({ length: 52 }, () => null));
      });
      return { rawM, harmM };
    }

    years.forEach((y, yi) => {
      rawM.push(Array.from({ length: 52 }, () => null));
      harmM.push(Array.from({ length: 52 }, () => null));

      const numWeeks = weeksInYear(y);
      for (let w = 0; w < numWeeks; w++) {
        const activeSats = regionData.activeSatellitesMatrix[yi]?.[w] ?? [];
        const nSat = activeSats.length;

        // If no satellites were operating according to the manifest, record as null (no data gap)
        if (regionData.source === "NASA FIRMS archive" && nSat === 0) {
          rawM[yi][w] = null;
          harmM[yi][w] = null;
          continue;
        }

        let dets = regionData.weeks[yi]?.[w] ?? [];
        if (scope && dets.length > 0) {
          dets = dets.filter((p) => (p.hex && res === 7 ? scope.has(p.hex) : scope.has(latLngToCell(p.lat, p.lon, res))));
        }

        const outRaw = harmonizeWeek(dets, nSat, { ...params, harmonize: false });
        const outHarm = harmonizeWeek(dets, nSat, params);

        rawM[yi][w] = outRaw.stat.raw;
        harmM[yi][w] = outHarm.stat.index;
      }
    });

    return { rawM, harmM };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionData, res, dCutoff, normalize, scope]);

  const value = harmonize ? grid.harmM : grid.rawM;
  const z = useMemo(() => zScores(value), [value]);

  /* ---------- Selected Week Hex Cells & Stats ---------- */
  const { hexes, regime, stat } = useMemo(() => {
    if (!regionData) {
      return { hexes: [] as HexCell[], regime: "BACKGROUND" as const, stat: { raw: 0, index: 0, frp: 0, cells: 0 } };
    }

    // Special World View case: use lazy-loaded H3 res 3 global file if available
    if (region.id === "world" && globalYearData && globalYearData.year === selectedYear) {
      const targetWeek = sel.w + 1;
      const cellsMap = new Map<string, { count: number; frp: number }>();
      for (let i = 0; i < globalYearData.w.length; i++) {
        if (globalYearData.w[i] === targetWeek) {
          const hStr = globalYearData.hexes[globalYearData.h[i]];
          const existing = cellsMap.get(hStr) ?? { count: 0, frp: 0 };
          existing.count += globalYearData.n[i];
          existing.frp += globalYearData.frp[i];
          cellsMap.set(hStr, existing);
        }
      }
      const fileRes = globalYearData.res ?? 3;
      const area = HEX_AREA_KM2[fileRes] ?? 12393;
      const worldHexes: HexCell[] = [...cellsMap].map(([hexId, d]) => ({
        hex: hexId,
        count: d.count,
        frp: d.frp,
        density: +(d.frp / area).toFixed(2),
      }));
      const totalRaw = worldHexes.reduce((acc, h) => acc + h.count, 0);
      const totalFrp = worldHexes.reduce((acc, h) => acc + h.frp, 0);
      return {
        hexes: worldHexes,
        regime: classifyRegime(worldHexes),
        stat: { raw: totalRaw, index: totalFrp / 2, frp: totalFrp, cells: worldHexes.length },
      };
    }

    // Standard regional detections
    const dets = regionData.weeks[sel.y]?.[sel.w] ?? [];
    const activeSats = regionData.activeSatellitesMatrix[sel.y]?.[sel.w] ?? [];
    const out = harmonizeWeek(dets, activeSats.length, { ...params, harmonize });
    return { hexes: out.hexes, regime: classifyRegime(out.hexes), stat: out.stat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionData, globalYearData, sel, region.id, selectedYear, res, dCutoff, normalize, harmonize]);

  // Display hexes on map: live cells if in live mode, else archive hexes
  const displayHexes: HexCell[] = useMemo(() => {
    if (liveMode && liveData?.mode === "LIVE" && liveData.cells.length > 0) {
      return liveData.cells.map((c) => ({
        hex: c.hex,
        count: c.count,
        frp: c.sum_frp,
        density: c.density,
      }));
    }
    return hexes;
  }, [liveMode, liveData, hexes]);

  const zSel = z[sel.y]?.[sel.w] ?? 0;
  const isSelectedWeekGap = value[sel.y]?.[sel.w] === null;

  const dateRange = useMemo(() => getWeekDateRange(selectedYear, sel.w + 1), [selectedYear, sel.w]);
  const selectedWeekLabel = `${selectedYear} W${sel.w + 1} (${dateRange.startStr} to ${dateRange.endStr})`;

  /* ---------- Jump to Biggest Historical Anomaly ---------- */
  const jumpToBiggestAnomaly = useCallback(() => {
    let maxZ = -Infinity;
    let best = { y: 0, w: 0 };
    z.forEach((row, yi) => {
      row.forEach((v, wi) => {
        if (v !== null && v > maxZ) {
          maxZ = v;
          best = { y: yi, w: wi };
        }
      });
    });
    setSel(best);
  }, [z]);

  /* ---------- Three-Step Demo Tour Handler ---------- */
  const handleDemoStep = (step: number) => {
    setDemoStep(step);
    if (step === 1) {
      setHarmonize(false); // Step 1: Show the raw problem
    } else if (step === 2) {
      setHarmonize(true); // Step 2: Show harmonization agreement
    } else if (step === 3) {
      setHarmonize(true);
      jumpToBiggestAnomaly(); // Step 3: Jump to strongest anomaly
    }
  };

  /* ---------- Computed Plain-English Headline ---------- */
  const computedHeadline = useMemo(() => {
    if (liveMode && liveData?.mode === "LIVE") {
      const rModis = liveData.per_sensor.raw.MODIS ?? 0;
      const rViirs = liveData.per_sensor.raw.VIIRS ?? 0;
      const hModis = liveData.per_sensor.harmonized.MODIS ?? 0;
      const hViirs = liveData.per_sensor.harmonized.VIIRS ?? 0;
      const rawRatio = rModis > 0 ? (rViirs / rModis).toFixed(1) : "—";
      const harmRatio = hModis > 0 ? (hViirs / hModis).toFixed(2) : "—";
      return `Live 24h: Raw VIIRS detections are ${rawRatio}× higher than MODIS; harmonized thermal index aligns within ${harmRatio}×.`;
    }

    if (proofData?.headline) {
      return proofData.headline;
    }

    return "Loading NASA FIRMS satellite observations...";
  }, [liveMode, liveData, proofData]);

  const exportCsv = useCallback(() => {
    const rows = ["year,week,date_start,date_end,value,z_score"];
    years.forEach((y, yi) => {
      const nWeeks = weeksInYear(y);
      for (let w = 0; w < nWeeks; w++) {
        const v = value[yi]?.[w];
        const zv = z[yi]?.[w];
        if (v !== null && v !== undefined) {
          const dr = getWeekDateRange(y, w + 1);
          rows.push(`${y},${w + 1},${dr.startStr},${dr.endStr},${v.toFixed(3)},${(zv ?? 0).toFixed(3)}`);
        }
      }
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `pyro-sync-${region.id}.csv`;
    a.click();
  }, [value, z, region.id]);

  return (
    <div className="ws">
      {/* 40px Top Telemetry Bar */}
      <header className="top">
        <strong style={{ letterSpacing: "0.08em" }}>PYRO-SYNC</strong>

        {/* Region selector */}
        <select
          aria-label="Select Region Preset"
          value={ri}
          onChange={(e) => {
            setRi(+e.target.value);
            setHex(null);
          }}
          disabled={liveMode}
        >
          {PRESETS.map((p, i) => (
            <option key={p.id} value={i}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Live vs Archive Toggle */}
        <div className="seg" role="group" aria-label="Data mode">
          <button
            aria-pressed={!liveMode}
            onClick={() => setLiveMode(false)}
            style={!liveMode ? { fontWeight: 600 } : {}}
          >
            Archive
          </button>
          <button
            aria-pressed={liveMode}
            onClick={() => setLiveMode(true)}
            style={liveMode ? { background: "var(--amber)", color: "#000", fontWeight: 700 } : {}}
          >
            Live (24h)
          </button>
        </div>

        {/* Status Pill */}
        {liveMode ? (
          liveLoading ? (
            <span className="pill mono" style={{ borderColor: "var(--amber)", color: "var(--amber)" }}>
              FETCHING LIVE…
            </span>
          ) : liveData?.mode === "LIVE" ? (
            <span className="pill mono" style={{ borderColor: "var(--green)", color: "var(--green)" }}>
              ● LIVE ({liveData.timestamp?.slice(11, 19)})
            </span>
          ) : (
            <span className="pill mono" style={{ borderColor: "var(--red)", color: "var(--red)" }}>
              CACHED ARCHIVE MODE
            </span>
          )
        ) : regionData?.source === "NASA FIRMS archive" ? (
          <span className="pill mono" style={{ borderColor: "var(--green)", color: "var(--green)" }}>
            NASA FIRMS archive
          </span>
        ) : (
          <span className="pill mono">SYNTHETIC DEMO</span>
        )}

        {/* Raw vs Harmonized Toggle (Prominent) */}
        <div className="seg" role="group" aria-label="Harmonization view">
          <button
            aria-pressed={!harmonize}
            onClick={() => {
              setHarmonize(false);
              setDemoStep(null);
            }}
            style={!harmonize ? { background: "var(--red)", color: "#fff", fontWeight: 700 } : {}}
            title="Raw hotspot detection counts without satellite normalization"
          >
            Raw count
          </button>
          <button
            aria-pressed={harmonize}
            onClick={() => {
              setHarmonize(true);
              setDemoStep(null);
            }}
            style={harmonize ? { background: "var(--core)", color: "#000", fontWeight: 700 } : {}}
            title="Harmonized thermal index normalized by active satellite effort"
          >
            Harmonized index
          </button>
        </div>

        <span className="grow" />

        {/* 3-Step Demo Tour */}
        <div className="seg" role="group" aria-label="Demo steps for video">
          <button
            aria-pressed={demoStep === 1}
            onClick={() => handleDemoStep(1)}
            title="Step 1: View raw hotspot counts showing sensor distortion"
          >
            1. Problem (Raw)
          </button>
          <button
            aria-pressed={demoStep === 2}
            onClick={() => handleDemoStep(2)}
            title="Step 2: Apply harmonization to restore true thermal trend"
          >
            2. Harmonize
          </button>
          <button
            aria-pressed={demoStep === 3}
            onClick={() => handleDemoStep(3)}
            title="Step 3: Jump to highest historical fire anomaly"
          >
            3. Anomaly
          </button>
        </div>

        <button onClick={jumpToBiggestAnomaly} title="Jump to the highest Z-score week in the record">
          ⚡ Jump to biggest anomaly
        </button>

        <button onClick={() => setShowGlossary(true)} title="Open Glossary of terms">
          📖 Glossary / Info
        </button>

        <button onClick={exportCsv}>Export CSV</button>
      </header>

      {/* One-Line Plain-English Computed Headline Banner */}
      <div className="headline-bar mono">
        <span>
          <strong style={{ color: "var(--amber)", marginRight: 6 }}>FINDING:</strong>
          {computedHeadline}
        </span>
        <span style={{ color: "var(--dim)", fontSize: 10 }}>
          {regionData?.coverageText ?? "Coverage: Terra, Aqua (2000–2017)"}
        </span>
      </div>

      {/* Map Section (65%) */}
      <section className="map" aria-label="Map view">
        <MapWorkbench
          hexes={displayHexes}
          center={liveMode && liveData?.mode === "LIVE" ? [20, 0] : region.center}
          zoom={liveMode && liveData?.mode === "LIVE" ? 2 : region.zoom}
          selected={hex}
          onPick={setHex}
          liveMode={liveMode && liveData?.mode === "LIVE"}
          selectedWeekLabel={selectedWeekLabel}
        />

        {/* Fallback Toast */}
        {!liveMode && regionData?.error && (
          <div className="status-toast" role="status">
            <span style={{ color: "var(--amber)", fontWeight: 600 }}>SYNTHETIC DEMO FALLBACK</span>
            <span style={{ color: "var(--dim)", margin: "0 8px" }}>·</span>
            <span style={{ color: "var(--dim)" }}>{regionData.error}</span>
          </div>
        )}
        {liveMode && liveError && !liveLoading && (
          <div className="status-toast" role="status">
            <span style={{ color: "var(--amber)", fontWeight: 600 }}>CACHED ARCHIVE MODE</span>
            <span style={{ color: "var(--dim)", margin: "0 8px" }}>·</span>
            <span style={{ color: "var(--dim)" }}>{liveError}</span>
            <button
              onClick={() => {
                setLiveLoading(true);
                setLiveError(null);
                fetch("/api/firms/live?res=4")
                  .then((r) => r.json())
                  .then((d) => {
                    setLiveData(d);
                    if (d.mode === "CACHED ARCHIVE MODE") setLiveError(d.reason ?? "Upstream unavailable");
                  })
                  .catch((e) => setLiveError(e.message))
                  .finally(() => setLiveLoading(false));
              }}
              style={{ marginLeft: 8, height: 20, padding: "0 6px", fontSize: 10 }}
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {/* Inspector Sidebar (35%) */}
      <aside className="insp" aria-label="Inspector sidebar">
        {liveMode ? (
          <>
            <h2>Global Live Telemetry (Last 24 Hours)</h2>
            <p className="panel-desc">Real-time H3 resolution-4 aggregates fetched from NASA FIRMS NRT.</p>

            {liveData?.mode === "LIVE" ? (
              <>
                <div className="kv mono">
                  <span>Total detections</span>
                  <span>{liveData.total_detections.toLocaleString()}</span>
                  <span>Active H3 cells (res 4)</span>
                  <span>{liveData.cells.length.toLocaleString()}</span>
                </div>

                <h2>Raw Hotspot Counts (Sensor Disparity)</h2>
                <p className="panel-desc">Raw pixels uncorrected for VIIRS 375 m pixel fragmentation.</p>
                <div className="kv mono">
                  <span>MODIS (Terra + Aqua)</span>
                  <span>{(liveData.per_sensor.raw.MODIS ?? 0).toLocaleString()}</span>
                  <span>VIIRS (SNPP + N20 + N21)</span>
                  <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                    {(liveData.per_sensor.raw.VIIRS ?? 0).toLocaleString()}
                  </span>
                  <span>Disparity ratio</span>
                  <span style={{ color: "var(--red)", fontWeight: 600 }}>
                    {liveData.per_sensor.raw.MODIS
                      ? ((liveData.per_sensor.raw.VIIRS ?? 0) / liveData.per_sensor.raw.MODIS).toFixed(1) + "× more VIIRS"
                      : "—"}
                  </span>
                </div>

                <h2>Harmonized Thermal Index (Agreement)</h2>
                <p className="panel-desc">Energy normalized by active satellites after spatial grouping.</p>
                <div className="kv mono">
                  <span>MODIS Thermal Index</span>
                  <span>{(liveData.per_sensor.harmonized.MODIS ?? 0).toLocaleString()} MW</span>
                  <span>VIIRS Thermal Index</span>
                  <span>{(liveData.per_sensor.harmonized.VIIRS ?? 0).toLocaleString()} MW</span>
                  <span>Combined Index</span>
                  <span style={{ color: "var(--core)", fontWeight: 600 }}>
                    {liveData.harmonized_index.toLocaleString()} MW
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-state mono">
                {liveLoading ? "Streaming live FIRMS telemetry…" : "Live feed paused. Showing archive fallback."}
              </div>
            )}
          </>
        ) : (
          <>
            <h2>Selected Week Telemetry</h2>
            <p className="panel-desc">{selectedWeekLabel}</p>

            {isSelectedWeekGap ? (
              <div className="empty-state mono">
                <p style={{ color: "var(--amber)", fontWeight: 600, marginBottom: 4 }}>NASA OBSERVATION GAP</p>
                <p style={{ color: "var(--dim)", fontSize: 11 }}>
                  Neither Terra nor Aqua recorded data during this period (e.g. 2013-12 to 2016-11 gap in archive).
                </p>
                <p style={{ color: "var(--dim)", fontSize: 10, marginTop: 4 }}>
                  Represented strictly as null (no data) to avoid false zero-fire biases.
                </p>
              </div>
            ) : (
              <div className="kv mono">
                <span>Observation Period</span>
                <span>{selectedYear} Week {sel.w + 1}</span>
                <span>Z-Score (Anomaly)</span>
                <span className={zSel >= zThr ? "badge crit" : ""}>
                  {zSel >= 0 ? "+" : ""}{zSel.toFixed(2)}σ
                </span>
                <span>Raw Hotspot Count</span>
                <span>{stat.raw.toLocaleString()}</span>
                <span>Active H3 Cells</span>
                <span>
                  {hexes.length.toLocaleString()}{" "}
                  {region.id === "world" ? `(res ${globalYearData?.res ?? 3})` : `(res ${res})`}
                </span>
                <span>Harmonized Thermal Index</span>
                <span>{stat.index.toFixed(1)} MW</span>
                <span>Fire Regime</span>
                <span className="badge">{regime}</span>
                <span>Hexagon Filter</span>
                <span>{hex ? hex.slice(0, 11) + "…" : "All cells (click map hex)"}</span>
              </div>
            )}

            <h2>Harmonization Controls</h2>
            <p className="panel-desc">Tune spatial aggregation, sensitivity cutoff, and overpass normalization.</p>

            <div className="row">
              <label htmlFor="res">H3 Resolution</label>
              <div className="seg">
                {([5, 6, 7] as const).map((r) => (
                  <button
                    key={r}
                    id={r === 5 ? "res" : undefined}
                    aria-pressed={res === r}
                    onClick={() => {
                      setRes(r);
                      setHex(null);
                    }}
                  >
                    res {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <label htmlFor="cut">VIIRS FRP Cutoff</label>
              <span className="mono">{cutoff.toFixed(1)} MW</span>
            </div>
            <input
              id="cut"
              type="range"
              min={0}
              max={6}
              step={0.1}
              value={cutoff}
              onChange={(e) => setCutoff(+e.target.value)}
              style={{ width: "100%", padding: 0 }}
            />

            <div className="row">
              <span>Overpass Normalization</span>
              <button aria-pressed={normalize} onClick={() => setNormalize(!normalize)}>
                {normalize ? "Active satellites" : "Off"}
              </button>
            </div>

            <h2>Harmonization Proof (Long-term Trend)</h2>
            <p className="panel-desc">NASA global totals (2000–2017). Normalized to 2003–2011 baseline = 1.0.</p>
            {proofData && (
              <HarmonizationProofChart
                data={proofData.points}
                hasViirs={proofData.hasViirs}
                baselineLabel={proofData.baselineYearsText}
              />
            )}

            {/* Satellite Coverage Strip */}
            <div className="coverage-strip mono">
              <div style={{ color: "var(--dim)", fontWeight: 600, marginBottom: 4 }}>
                SATELLITE COVERAGE RECORD (MANIFEST)
              </div>
              <div className="coverage-row">
                <span style={{ width: 80 }}>Terra:</span>
                <div className="coverage-bar">
                  <div className="coverage-span" style={{ left: "0%", width: "65%" }} />
                  <div className="coverage-gap" style={{ left: "50%", width: "12%" }} title="Gap: 2013-12 to 2016-11" />
                </div>
                <span>2000–2017</span>
              </div>
              <div className="coverage-row">
                <span style={{ width: 80 }}>Aqua:</span>
                <div className="coverage-bar">
                  <div className="coverage-span" style={{ left: "8%", width: "57%" }} />
                  <div className="coverage-gap" style={{ left: "50%", width: "12%" }} title="Gap: 2013-12 to 2016-11" />
                </div>
                <span>2002–2017</span>
              </div>
              <div className="coverage-row">
                <span style={{ width: 80 }}>VIIRS (SNPP):</span>
                <div className="coverage-bar" style={{ background: "#1A1D24" }} />
                <span style={{ color: "var(--dim)" }}>Archive pending</span>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Burning Calendar Dock (240px) */}
      <section className="dock" aria-label="Calendar dock">
        <div className="row" style={{ margin: "0 0 4px" }}>
          <div>
            <h2 style={{ margin: 0 }}>
              Burning Activity Matrix · {region.name}
            </h2>
            <span style={{ fontSize: 10, color: "var(--dim)" }}>
              {selectedWeekLabel} · Click any week cell to inspect
            </span>
          </div>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="zt" className="mono">
              Anomaly Z ≥ {zThr.toFixed(1)}σ
            </label>
            <input
              id="zt"
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={zThr}
              onChange={(e) => setZThr(+e.target.value)}
              style={{ padding: 0 }}
            />
            <button aria-pressed={onlyAnom} onClick={() => setOnlyAnom(!onlyAnom)}>
              Anomalies only
            </button>
          </span>
        </div>
        <BurningCalendarMatrix
          z={z}
          value={value}
          selected={sel}
          threshold={zThr}
          onlyAnomalies={onlyAnom}
          onSelect={(y, w) => setSel({ y, w })}
        />
      </section>

      {/* Glossary Modal / Drawer */}
      {showGlossary && (
        <div className="glossary-modal" onClick={() => setShowGlossary(false)}>
          <div className="glossary-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, margin: 0, color: "var(--core)" }}>Telemetry Glossary &amp; Guide</h2>
              <button onClick={() => setShowGlossary(false)}>Close ✕</button>
            </div>

            <div className="glossary-item">
              <h3>Raw Hotspot Count</h3>
              <p>
                The total count of individual satellite pixels flagged as active fires. Because newer instruments
                (like VIIRS with 375 m pixels) have 7× smaller pixels than older instruments (MODIS with 1 km pixels),
                a single fire event is broken into multiple detections. Comparing raw counts across decades creates a
                false impression of a sudden fire surge.
              </p>
            </div>

            <div className="glossary-item">
              <h3>Harmonized Thermal Index</h3>
              <p>
                PYRO-SYNC&apos;s physical standardization metric. It snaps raw points into standard hexagonal H3 cells,
                groups by satellite overpass day, applies a minimum fire sensitivity cutoff, and divides by the number
                of operational observation satellites. This produces a continuous, calibrated fire timeline across sensor
                generations.
              </p>
            </div>

            <div className="glossary-item">
              <h3>Z-Score (σ)</h3>
              <p>
                The standardized anomaly metric comparing fire intensity in a specific week against that same week of the
                year across all historical observation years: \( Z = (x - \mu) / \sigma \). A Z-score of +2.0σ or greater
                indicates anomalous burning exceeding 97.7% of historical norms.
              </p>
            </div>

            <div className="glossary-item">
              <h3>H3 Hexagonal Cell</h3>
              <p>
                A discrete global hexagonal grid system. Resolution 7 cells (~5.2 km² each) aggregate agricultural burns
                and local fire fronts without spatial distortion. Resolution 4 cells (~1,770 km²) aggregate continental
                and global burning activity.
              </p>
            </div>

            <div className="glossary-item">
              <h3>Fire Radiative Power (FRP)</h3>
              <p>
                Instantaneous radiant heat emission measured in Megawatts (MW) via mid-infrared radiometry. FRP is
                linearly proportional to the rate of biomass consumption and carbon emissions.
              </p>
            </div>

            <div className="glossary-item">
              <h3>Coverage &amp; Data Gaps</h3>
              <p>
                Determined strictly by NASA acquisition dates recorded in <code>manifest.json</code>. Years or weeks where
                satellites were not operational (such as Terra prior to November 2000, or the archive gap between December 2013
                and November 2016) are preserved as <em>null</em> rather than zero.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
