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
import InfoTip from "./InfoTip";
import ProductLanding from "./ProductLanding";

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

  // View mode: interactive Workbench vs Product Overview & Docs
  const [viewMode, setViewMode] = useState<"workbench" | "product">("workbench");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "product" || window.location.hash === "#product") {
      setViewMode("product");
    }
  }, []);

  // Mobile navigation tab for small screens (< 900px)
  const [mobileTab, setMobileTab] = useState<"map" | "inspector" | "matrix">("map");

  // Desktop layout focus mode
  const [focusMode, setFocusMode] = useState<"cockpit" | "map" | "calendar">("cockpit");

  const handleSetViewMode = (mode: "workbench" | "product") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (mode === "product") {
        url.searchParams.set("view", "product");
      } else {
        url.searchParams.delete("view");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Dynamic layout resizers (cells window & map/inspector width)
  const [dockHeight, setDockHeight] = useState(170);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [isDraggingCol, setIsDraggingCol] = useState(false);

  const startRowResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingRow(true);
      const startY = e.clientY;
      const startH = dockCollapsed ? 170 : dockHeight;
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const newH = Math.max(32, Math.min(480, startH + deltaY));
        if (newH <= 45) {
          setDockCollapsed(true);
          setDockHeight(32);
        } else {
          setDockCollapsed(false);
          setDockHeight(newH);
        }
      };
      const onMouseUp = () => {
        setIsDraggingRow(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [dockCollapsed, dockHeight]
  );

  const startColResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingCol(true);
      const startX = e.clientX;
      const startW = sidebarCollapsed ? 360 : sidebarWidth;
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX; // dragging left widens sidebar
        const newW = Math.max(260, Math.min(650, startW + deltaX));
        setSidebarCollapsed(false);
        setSidebarWidth(newW);
      };
      const onMouseUp = () => {
        setIsDraggingCol(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [sidebarCollapsed, sidebarWidth]
  );

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

  if (viewMode === "product") {
    return (
      <div className="product-view-container">
        <header className="top" style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <strong style={{ letterSpacing: "0.08em" }}>PYRO-SYNC</strong>
          <span className="pill mono" style={{ borderColor: "var(--green)", color: "var(--green)" }}>
            NASA FIRMS TELEMETRY
          </span>
          <span className="grow" />
          <div className="seg">
            <button
              onClick={() => handleSetViewMode("workbench")}
              style={{ background: "var(--amber)", color: "#000", fontWeight: 700 }}
            >
              Launch Telemetry Workbench →
            </button>
          </div>
        </header>
        <ProductLanding
          onLaunchWorkbench={(idx, live) => {
            if (idx !== undefined) setRi(idx);
            if (live !== undefined) setLiveMode(live);
            handleSetViewMode("workbench");
          }}
        />
      </div>
    );
  }

  return (
    <div className={`ws ${isDraggingRow || isDraggingCol ? "resizing" : ""} mobile-view-${mobileTab} focus-${focusMode}`}>
      {/* 40px Top Telemetry Bar */}
      <header className="top">
        <strong style={{ letterSpacing: "0.08em" }}>PYRO-SYNC</strong>

        {/* View Switcher */}
        <div className="seg" role="group" aria-label="Page view switcher">
          <button
            aria-pressed={true}
            style={{ background: "var(--core)", color: "#000", fontWeight: 700 }}
            title="Interactive Telemetry Workbench"
          >
            🛰️ Workbench
          </button>
          <button
            aria-pressed={false}
            onClick={() => handleSetViewMode("product")}
            title="Product Overview, Methodology & Science Documentation"
          >
            📖 Product &amp; Docs
          </button>
        </div>

        {/* Desktop Focus Mode Switcher */}
        <div className="seg desktop-only" role="group" aria-label="Layout Focus Mode">
          <button
            aria-pressed={focusMode === "cockpit"}
            onClick={() => setFocusMode("cockpit")}
            style={focusMode === "cockpit" ? { fontWeight: 700, background: "var(--panel-elevated)", color: "var(--text)" } : {}}
            title="Cockpit: Balanced Map, Telemetry Inspector & Burning Matrix"
          >
            Cockpit
          </button>
          <button
            aria-pressed={focusMode === "map"}
            onClick={() => setFocusMode("map")}
            style={focusMode === "map" ? { fontWeight: 700, background: "var(--panel-elevated)", color: "var(--text)" } : {}}
            title="Map Focus: Maximized GeoSpatial View"
          >
            Map
          </button>
          <button
            aria-pressed={focusMode === "calendar"}
            onClick={() => setFocusMode("calendar")}
            style={focusMode === "calendar" ? { fontWeight: 700, background: "var(--panel-elevated)", color: "var(--text)" } : {}}
            title="Calendar Focus: Expanded 26-Year Matrix View"
          >
            Matrix
          </button>
        </div>

        {/* Region selector */}
        <div style={{ display: "inline-flex", alignItems: "center" }}>
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
          <InfoTip
            title="Benchmark Region Preset"
            desc="Select between localized high-resolution (res 7) benchmark regions (Punjab agricultural, California wildfire, Amazon deforestation) or global (res 3) telemetry."
          />
        </div>

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
          <InfoTip
            title="Data Feed Mode"
            desc="Archive: 26-year calibrated NASA FIRMS multi-satellite historical record (2000–2026). Live: Real-time 24h stream from NASA FIRMS NRT."
          />
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
          <InfoTip
            title="Harmonization Mode"
            desc="Raw: Unadjusted detections (VIIRS 375m pixels cause false 5x surge). Harmonized: Grouped by H3 cells, filtered by sensitivity cutoff, and normalized by active satellite overpasses."
            formula="Index = Σ(FRP) / N_sats"
          />
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
          <InfoTip
            title="3-Step Demo Tour"
            desc="Step 1: See raw sensor disparity jump in 2012. Step 2: Harmonize to reveal true thermal energy. Step 3: Jump to historical record anomaly."
          />
        </div>

        <button onClick={jumpToBiggestAnomaly} title="Jump to the highest Z-score week in the record">
          ⚡ Jump to anomaly
          <InfoTip
            title="Peak Anomaly Jump"
            desc="Selects the single calendar week with the highest statistical anomaly Z-score across the entire 26-year historical record."
            formula="Z_max = max(Z_{y,w})"
          />
        </button>

        <button onClick={() => setShowGlossary(true)} title="Open Glossary of terms">
          📖 Glossary
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

      {/* Mobile Tab Switcher for Small Screens */}
      <nav className="mobile-nav-bar" aria-label="Mobile View Navigation">
        <button
          className={`mobile-tab-btn ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          🗺️ Map View
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === "inspector" ? "active" : ""}`}
          onClick={() => setMobileTab("inspector")}
        >
          📊 Telemetry
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === "matrix" ? "active" : ""}`}
          onClick={() => setMobileTab("matrix")}
        >
          📅 Calendar
        </button>
      </nav>

      {/* Middle Pane: Map (left) + Resizer + Inspector Sidebar (right) */}
      <div className="middle-pane">
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

        {/* Draggable Column Resizer */}
        <div
          className={`resizer-col ${isDraggingCol ? "active" : ""}`}
          onMouseDown={startColResize}
          onDoubleClick={() => setSidebarWidth(360)}
          title="Drag horizontally to resize inspector sidebar (double-click to reset)"
        >
          <div className="resizer-col-handle" />
        </div>

        {/* Inspector Sidebar (Resizable & Collapsible) */}
        {!sidebarCollapsed ? (
          <aside
            className="insp"
            aria-label="Inspector sidebar"
            style={{ width: sidebarWidth }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                TELEMETRY INSPECTOR
              </span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                style={{ fontSize: 10, height: 20, padding: "0 6px" }}
                title="Collapse inspector to maximize map"
              >
                Collapse ⇥
              </button>
            </div>
        {liveMode ? (
          <>
            <h2>
              Global Live Telemetry (Last 24 Hours)
              <InfoTip
                title="Global NRT Feed"
                desc="Real-time satellite active fire detections streamed directly from NASA FIRMS NRT endpoints within the last 24 hours."
              />
            </h2>
            <p className="panel-desc">Real-time H3 resolution-4 aggregates fetched from NASA FIRMS NRT.</p>

            {liveData?.mode === "LIVE" ? (
              <>
                <div className="kv mono">
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    Total detections
                    <InfoTip title="Total Detections (24h)" desc="Sum of all individual active fire pixels detected across the globe in the last 24 hours." />
                  </span>
                  <span>{liveData.total_detections.toLocaleString()}</span>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    Active H3 cells (res 4)
                    <InfoTip title="Active Hexagonal Cells" desc="Unique H3 resolution-4 hexagonal cells (~1,770 km²) containing confirmed fire energy." />
                  </span>
                  <span>{liveData.cells.length.toLocaleString()}</span>
                </div>

                <h2>
                  Raw Hotspot Counts (Sensor Disparity)
                  <InfoTip
                    title="Sensor Count Disparity"
                    desc="Raw detections uncorrected for VIIRS 375m pixel fragmentation. Because VIIRS pixels are 7x smaller than MODIS 1km pixels, a single fire produces multiple VIIRS counts."
                  />
                </h2>
                <p className="panel-desc">Raw pixels uncorrected for VIIRS 375 m pixel fragmentation.</p>
                <div className="kv mono">
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    MODIS (Terra + Aqua)
                    <InfoTip title="MODIS Detections" desc="1 km nadir resolution sensors aboard NASA Terra (10:30) and Aqua (13:30)." />
                  </span>
                  <span>{(liveData.per_sensor.raw.MODIS ?? 0).toLocaleString()}</span>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    VIIRS (SNPP + N20 + N21)
                    <InfoTip title="VIIRS Detections" desc="375 m nadir resolution sensors aboard Suomi-NPP, NOAA-20, and NOAA-21." />
                  </span>
                  <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                    {(liveData.per_sensor.raw.VIIRS ?? 0).toLocaleString()}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    Disparity ratio
                    <InfoTip title="Count Disparity Multiplier" desc="Ratio of raw VIIRS detections to raw MODIS detections over the same fire events." formula="Ratio = N_VIIRS / N_MODIS" />
                  </span>
                  <span style={{ color: "var(--red)", fontWeight: 600 }}>
                    {liveData.per_sensor.raw.MODIS
                      ? ((liveData.per_sensor.raw.VIIRS ?? 0) / liveData.per_sensor.raw.MODIS).toFixed(1) + "× more VIIRS"
                      : "—"}
                  </span>
                </div>

                <h2>
                  Harmonized Thermal Index (Agreement)
                  <InfoTip
                    title="Harmonized Thermal Index"
                    desc="Fire Radiative Power (MW) normalized by active satellites after spatial H3 cell grouping, bringing MODIS and VIIRS into physical agreement."
                    formula="Index = Σ(FRP) / N_sats"
                  />
                </h2>
                <p className="panel-desc">Energy normalized by active satellites after spatial grouping.</p>
                <div className="kv mono">
                  <span>MODIS Thermal Index</span>
                  <span>{(liveData.per_sensor.harmonized.MODIS ?? 0).toLocaleString()} MW</span>
                  <span>VIIRS Thermal Index</span>
                  <span>{(liveData.per_sensor.harmonized.VIIRS ?? 0).toLocaleString()} MW</span>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    Combined Index
                    <InfoTip title="Combined Thermal Energy" desc="Unified thermal energy rating across all active satellites." />
                  </span>
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
            <h2>
              Selected Week Telemetry
              <InfoTip
                title="Weekly Telemetry"
                desc="Detailed thermal and statistical metrics for the selected calendar week in the historical archive."
              />
            </h2>
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
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Observation Period
                  <InfoTip title="Calendar Week" desc="Calendar week of the year (1 to 52). Week 1 starts Jan 1; Week 52 contains remaining days." />
                </span>
                <span>{selectedYear} Week {sel.w + 1}</span>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Z-Score (Anomaly)
                  <InfoTip title="Rolling Anomaly Z-Score" desc="Statistical deviation relative to multi-decadal historical mean for this calendar week. Z ≥ +2.0 indicates an extreme fire event." formula="Z = (Index - μ_w) / σ_w" />
                </span>
                <span className={zSel >= zThr ? "badge crit" : ""}>
                  {zSel >= 0 ? "+" : ""}{zSel.toFixed(2)}σ
                </span>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Raw Hotspot Count
                  <InfoTip title="Raw Detection Hotspots" desc="Total unaggregated satellite pixels flagged as active fires. Severely inflated by VIIRS 375m pixels." />
                </span>
                <span>{stat.raw.toLocaleString()}</span>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Active H3 Cells
                  <InfoTip title="Active Hexagonal Cells" desc="Number of discrete H3 hexagonal cells with active fire detections in this week." />
                </span>
                <span>
                  {hexes.length.toLocaleString()}{" "}
                  {region.id === "world" ? `(res ${globalYearData?.res ?? 3})` : `(res ${res})`}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Harmonized Thermal Index
                  <InfoTip title="Harmonized Thermal Index (MW)" desc="Total Fire Radiative Power across grouped cells divided by active satellites orbiting that week." formula="Index = Σ FRP / N_active" />
                </span>
                <span>{stat.index.toFixed(1)} MW</span>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Fire Regime
                  <InfoTip title="Fire Regime Classification" desc="Automated classification: BACKGROUND (low baseline), ELEVATED (moderate cluster), or EXTREME (major wildfire outbreak)." />
                </span>
                <span className="badge">{regime}</span>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  Hexagon Filter
                  <InfoTip title="Localized Hexagon Filter" desc="Click any hexagon on the map to filter the matrix and proof charts specifically to that localized cell." />
                </span>
                <span>{hex ? hex.slice(0, 11) + "…" : "All cells (click map hex)"}</span>
              </div>
            )}

            <h2>
              Harmonization Controls
              <InfoTip
                title="Tuning Parameters"
                desc="Interactive calibration controls: spatial resolution grid, VIIRS sensitivity cutoff, and overpass effort normalization."
              />
            </h2>
            <p className="panel-desc">Tune spatial aggregation, sensitivity cutoff, and overpass normalization.</p>

            <div className="row">
              <label htmlFor="res" style={{ display: "inline-flex", alignItems: "center" }}>
                H3 Resolution
                <InfoTip title="Spatial Hexagon Resolution" desc="H3 discrete spatial index: res 5 (~253 km²), res 6 (~36 km²), res 7 (~5.16 km²). Res 7 is recommended for regional fidelity." />
              </label>
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
              <label htmlFor="cut" style={{ display: "inline-flex", alignItems: "center" }}>
                VIIRS FRP Cutoff
                <InfoTip title="VIIRS Sensitivity Cutoff" desc="Applied to cell total FRP to filter out small fires that MODIS cannot detect, preventing low-energy baseline inflation." formula="cutoff = 0.0 - 6.0 MW" />
              </label>
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
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                Overpass Normalization
                <InfoTip title="Overpass Effort Normalization" desc="Dividing by the active satellite count prevents false fire increases simply from adding more satellites into orbit." formula="div = max(1, N_active)" />
              </span>
              <button aria-pressed={normalize} onClick={() => setNormalize(!normalize)}>
                {normalize ? "Active satellites" : "Off"}
              </button>
            </div>

            <h2>
              Harmonization Proof (Long-term Trend)
              <InfoTip title="Decadal Proof Chart" desc="Compares yearly raw detection counts to the harmonized index across 2000–2026. Pre-VIIRS baseline (2003–2011) is normalized to 1.0." />
            </h2>
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
    ) : (
      <div
        className="sidebar-collapsed-bar"
        onClick={() => setSidebarCollapsed(false)}
        title="Click to expand Inspector sidebar"
      >
        <span>⇤ SHOW INSPECTOR</span>
      </div>
    )}
  </div>

  {/* Draggable Row Resizer */}
  <div
    className={`resizer-row ${isDraggingRow ? "active" : ""}`}
    onMouseDown={startRowResize}
    onDoubleClick={() => setDockCollapsed(!dockCollapsed)}
    title="Drag up/down to resize cells matrix (double-click to toggle collapse)"
  >
    <div className="resizer-handle" />
  </div>

  {/* Burning Activity Matrix Dock (Resizable & Collapsible) */}
  <section
    className="dock"
    aria-label="Calendar dock"
    style={{
      height:
        focusMode === "calendar"
          ? undefined
          : dockCollapsed || focusMode === "map"
          ? 32
          : dockHeight,
    }}
  >
        <div className="dock-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, display: "inline-flex", alignItems: "center" }}>
              Burning Activity Matrix · {region.name}
              <InfoTip
                title="26-Year Burning Activity Matrix"
                desc="Weekly thermal activity across 2000–2026. Each cell represents one calendar week (W1–W52). Color indicates normalized fire index or anomaly Z-score."
              />
            </h2>
            <span style={{ fontSize: 10, color: "var(--dim)" }}>
              {dockCollapsed ? "(Collapsed — click Expand to view matrix)" : selectedWeekLabel}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!dockCollapsed && (
              <>
                <label htmlFor="zt" className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  Z ≥ {zThr.toFixed(1)}σ
                  <InfoTip
                    title="Anomaly Threshold"
                    desc="Filter matrix to highlight weeks with fire activity exceeding this many standard deviations above historical mean."
                    formula="Z = (x - μ_w) / σ_w"
                  />
                </label>
                <input
                  id="zt"
                  type="range"
                  min={0}
                  max={4}
                  step={0.1}
                  value={zThr}
                  onChange={(e) => setZThr(+e.target.value)}
                  style={{ padding: 0, width: 70 }}
                />
                <button
                  aria-pressed={onlyAnom}
                  onClick={() => setOnlyAnom(!onlyAnom)}
                  style={{ fontSize: 10, height: 22 }}
                >
                  Anomalies only
                </button>
              </>
            )}

            <button
              onClick={() => setDockCollapsed(!dockCollapsed)}
              style={{
                fontSize: 10,
                height: 22,
                padding: "0 8px",
                background: dockCollapsed ? "var(--amber)" : "var(--bg)",
                color: dockCollapsed ? "#000" : "var(--text)",
                fontWeight: 600,
              }}
              title={dockCollapsed ? "Expand matrix cells window" : "Collapse matrix cells to maximize map"}
            >
              {dockCollapsed ? "⤢ Expand Cells Matrix" : "— Collapse Cells (View Map)"}
            </button>
          </div>
        </div>

        {!dockCollapsed && (
          <BurningCalendarMatrix
            z={z}
            value={value}
            selected={sel}
            threshold={zThr}
            onlyAnomalies={onlyAnom}
            onSelect={(y, w) => setSel({ y, w })}
          />
        )}
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
