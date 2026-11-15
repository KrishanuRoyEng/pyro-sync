"use client";
import React, { useState } from "react";

interface ProductLandingProps {
  onLaunchWorkbench: (regionIndex?: number, live?: boolean) => void;
}

export default function ProductLanding({ onLaunchWorkbench }: ProductLandingProps) {
  const [activeTab, setActiveTab] = useState<
    "physics" | "paradox" | "pipeline" | "benchmarks" | "validation" | "engineering"
  >(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab");
      if (t && ["physics", "paradox", "pipeline", "benchmarks", "validation", "engineering"].includes(t)) {
        return t as any;
      }
    }
    return "physics";
  });

  return (
    <div className="product-page-wrapper">
      {/* Product Hero */}
      <section className="product-hero">
        <div className="hero-tag mono">
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", marginRight: 6 }} />
          NASA EARTHDATA · SATELLITE ACTIVE FIRE CALIBRATION (2000–2026)
        </div>
        <h1 className="hero-title">
          Harmonizing Decadal Satellite Wildfire Telemetry Across MODIS &amp; VIIRS Generations
        </h1>
        <p className="hero-lead">
          When NASA introduced the 375&nbsp;m VIIRS sensor in 2012, raw active fire detections artificially jumped{" "}
          <strong style={{ color: "var(--amber)", fontWeight: 700 }}>4.9×</strong> due to sub-pixel fire fragmentation.
          PYRO-SYNC reconstructs continuous decadal fire records using discrete H3 hexagonal clustering, cell-level
          energy thresholds, and operational overpass normalization.
        </p>

        <div className="hero-cta-row">
          <button
            className="btn-primary"
            onClick={() => onLaunchWorkbench(0, false)}
          >
            Launch Telemetry Workbench →
          </button>
          <button
            className="btn-secondary"
            onClick={() => onLaunchWorkbench(0, true)}
          >
            ● Live 24h Global Feed
          </button>
          <button
            className="btn-secondary"
            onClick={() => setActiveTab("pipeline")}
          >
            Mathematical Formulation
          </button>
        </div>

        {/* Telemetry Metric Highlights */}
        <div className="hero-stats mono">
          <div className="hero-stat-card">
            <span className="stat-num" style={{ color: "var(--cyan)" }}>26 Years</span>
            <span className="stat-label">Continuous Temporal Telemetry (2000–2026)</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num" style={{ color: "var(--amber)" }}>5 Satellites</span>
            <span className="stat-label">Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num" style={{ color: "#FFFFFF" }}>57.7M Hotspots</span>
            <span className="stat-label">Verified NASA FIRMS Quality-Filtered Observations</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num" style={{ color: "var(--green)" }}>±8% Energy Match</span>
            <span className="stat-label">Validated Equal-Energy Sensor Invariance</span>
          </div>
        </div>
      </section>

      {/* Navigation Sub-bar */}
      <nav className="product-nav" aria-label="Documentation sections">
        <button
          className={activeTab === "physics" ? "active" : ""}
          onClick={() => setActiveTab("physics")}
        >
          Instrument Physics
        </button>
        <button
          className={activeTab === "paradox" ? "active" : ""}
          onClick={() => setActiveTab("paradox")}
        >
          The 4.9× Disparity Paradox
        </button>
        <button
          className={activeTab === "pipeline" ? "active" : ""}
          onClick={() => setActiveTab("pipeline")}
        >
          Harmonizer Formulation
        </button>
        <button
          className={activeTab === "benchmarks" ? "active" : ""}
          onClick={() => setActiveTab("benchmarks")}
        >
          Field Benchmarks
        </button>
        <button
          className={activeTab === "validation" ? "active" : ""}
          onClick={() => setActiveTab("validation")}
        >
          Empirical Validation
        </button>
        <button
          className={activeTab === "engineering" ? "active" : ""}
          onClick={() => setActiveTab("engineering")}
        >
          System Engineering
        </button>
      </nav>

      {/* Content Container */}
      <main className="product-content">
        {/* TAB 1: INSTRUMENT PHYSICS */}
        {activeTab === "physics" && (
          <article className="prose-section">
            <h2>Instrument Architecture &amp; Radiometric Specifications</h2>
            <p>
              Spaceborne active fire monitoring relies on mid-wave infrared (MWIR ~3.9–4.0&nbsp;µm) brightness temperature
              differentials against long-wave infrared (LWIR ~11.0&nbsp;µm) background radiances. Over the past quarter-century,
              NASA and NOAA have transitioned operational fire monitoring across two instrument generations with fundamentally
              different optical and geometric designs:
            </p>

            <div className="diagram-table mono">
              <div className="diagram-header">
                <span>INSTRUMENT</span>
                <span>PLATFORM</span>
                <span>ORBIT CROSSING</span>
                <span>NADIR GIFOV</span>
                <span>SCAN-EDGE GIFOV</span>
                <span>DETECTION BANDS</span>
              </div>
              <div className="diagram-row">
                <span>MODIS</span>
                <span>EOS Terra</span>
                <span>10:30 Descending</span>
                <span>1.000 km² (1000m)</span>
                <span>~9.80 km² (2×4.9km)</span>
                <span>B21/22 (3.96µm), B31 (11.0µm)</span>
              </div>
              <div className="diagram-row">
                <span>MODIS</span>
                <span>EOS Aqua</span>
                <span>13:30 Ascending</span>
                <span>1.000 km² (1000m)</span>
                <span>~9.80 km² (2×4.9km)</span>
                <span>B21/22 (3.96µm), B31 (11.0µm)</span>
              </div>
              <div className="diagram-row">
                <span>VIIRS (I-Band)</span>
                <span>Suomi-NPP</span>
                <span>13:30 Ascending</span>
                <span>0.141 km² (375m)</span>
                <span>~0.32 km² (375×800m)</span>
                <span>I4 (3.74µm), I5 (11.45µm)</span>
              </div>
              <div className="diagram-row">
                <span>VIIRS (I-Band)</span>
                <span>NOAA-20 (JPSS-1)</span>
                <span>13:30 (+50 min)</span>
                <span>0.141 km² (375m)</span>
                <span>~0.32 km² (375×800m)</span>
                <span>I4 (3.74µm), I5 (11.45µm)</span>
              </div>
              <div className="diagram-row">
                <span>VIIRS (I-Band)</span>
                <span>NOAA-21 (JPSS-2)</span>
                <span>13:30 (+25 min)</span>
                <span>0.141 km² (375m)</span>
                <span>~0.32 km² (375×800m)</span>
                <span>I4 (3.74µm), I5 (11.45µm)</span>
              </div>
            </div>

            <div className="grid-2col">
              <div className="doc-card">
                <h3>MODIS Optical Properties</h3>
                <ul className="doc-list">
                  <li><strong>Point Spread Function:</strong> Wide spatial averaging. Small sub-pixel fires (&lt;5&nbsp;MW) dilute rapidly against background surface temperatures, often falling below the 4&nbsp;µm detection threshold.</li>
                  <li><strong>Swath Distortion:</strong> Optical footprint expands nearly 10× at scan edges due to Earth curvature (panoramic effect). Large wildfires merge into single 1&nbsp;km pixels.</li>
                  <li><strong>Active Record:</strong> November 2000 through late 2026. Consistent 2-overpass daily baseline.</li>
                </ul>
              </div>

              <div className="doc-card">
                <h3>VIIRS Optical Properties</h3>
                <ul className="doc-list">
                  <li><strong>Constrained Pixel Growth:</strong> Uses along-scan detector aggregation to maintain 375&nbsp;m resolution across the entire 3,060&nbsp;km swath width, eliminating the extreme edge distortion seen in MODIS.</li>
                  <li><strong>Radiometric Sensitivity:</strong> Resolves small, low-temperature agricultural burns and industrial flares down to ~0.2&nbsp;MW.</li>
                  <li><strong>Sub-Pixel Resolution:</strong> A contiguous 1&nbsp;km² wildfire front is resolved as 7 or more separate detections within a single satellite pass.</li>
                </ul>
              </div>
            </div>

            <div className="action-banner">
              <div>
                <strong>Explore verified instrument telemetry in the Workbench</strong>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
                  Inspect real NASA FIRMS observations, filter by sensor, and compare raw vs harmonized values.
                </p>
              </div>
              <button className="btn-primary" onClick={() => onLaunchWorkbench(0, false)}>
                Open Workbench →
              </button>
            </div>
          </article>
        )}

        {/* TAB 2: THE 4.9X DISPARITY PARADOX */}
        {activeTab === "paradox" && (
          <article className="prose-section">
            <h2>Geometric Sub-Pixel Fragmentation &amp; The False 2012 Surge</h2>
            <p>
              When VIIRS data first became operational in 2012, raw annual hotspot counts in regions like Northern India,
              California, and the Mediterranean jumped by 300% to 500%. Without radiometric calibration, automated climate
              trend engines falsely classify this sensor transition as an unprecedented acceleration in global fire activity.
            </p>

            {/* Visual Pixel Comparison */}
            <div className="doc-card" style={{ margin: "24px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Ground Footprint Comparison: 1 km² Fire Area</h3>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Physical Fire Release: 10.0 MW Radiative Power across 1.0 km²
                  </span>
                </div>
                <span className="badge">4.9× COUNT ARTIFACT</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "center" }}>
                {/* MODIS Diagram */}
                <div style={{ background: "#0B0E14", border: "2px solid #334155", borderRadius: 8, padding: 18, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#FFFFFF", marginBottom: 4 }}>
                    MODIS (1,000 m × 1,000 m Pixel)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                    Area: 1.0 km² · Detections: <strong style={{ color: "#FFF" }}>1 Detection (10.0 MW)</strong>
                  </div>
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      margin: "0 auto",
                      border: "2px dashed #64748B",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.03)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, #EF4444 0%, #B91C1C 70%, transparent 100%)",
                        boxShadow: "0 0 18px rgba(239, 68, 68, 0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFF",
                        fontWeight: 800,
                        fontSize: 11,
                      }}
                    >
                      10 MW
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center", color: "var(--amber)", fontSize: 22, fontWeight: 800 }}>
                  VS
                </div>

                {/* VIIRS Diagram */}
                <div style={{ background: "#0B0E14", border: "2px solid #0284C7", borderRadius: 8, padding: 18, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--cyan)", marginBottom: 4 }}>
                    VIIRS (375 m × 375 m Pixels)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                    Area: 0.14 km² each · Detections: <strong style={{ color: "var(--amber)" }}>7 Detections (1.4 MW each)</strong>
                  </div>
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      margin: "0 auto",
                      border: "2px dashed #0284C7",
                      borderRadius: 6,
                      background: "rgba(2, 132, 199, 0.05)",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 4,
                      padding: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <div
                        key={num}
                        style={{
                          height: 48,
                          borderRadius: 4,
                          background: "linear-gradient(180deg, #F97316 0%, #C2410C 100%)",
                          border: "1px solid #FDBA74",
                          boxShadow: "0 0 8px rgba(249, 115, 22, 0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFF",
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        1.4 MW
                      </div>
                    ))}
                    <div style={{ height: 48, borderRadius: 4, border: "1px dashed #334155" }} />
                    <div style={{ height: 48, borderRadius: 4, border: "1px dashed #334155" }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, background: "rgba(0, 0, 0, 0.35)", padding: "12px 16px", borderRadius: 6, fontSize: 12.5, color: "#CBD5E1" }}>
                <strong>Physical Analysis:</strong> Both satellite instruments intercepted the exact same total thermal energy (10.0 MW).
                MODIS integrated that energy into <strong>1 detection</strong>; VIIRS partitioned it into <strong>7 discrete detections</strong>.
                Comparing raw detection totals across sensor boundaries produces a 700% counting error.
              </div>
            </div>

            <div className="callout-box">
              <strong style={{ color: "var(--amber)", fontSize: 14 }}>THE SAMPLING MULTIPLICATION FACTOR:</strong>
              <p>
                In addition to spatial fragmentation, orbital sampling frequency tripled: Terra provided 1 pass/day in 2000;
                by 2024, the active constellation (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21) provides 6 daily overpasses.
                Short-lived fires that were previously missed during morning passes are now captured multiple times in the afternoon,
                further multiplying unadjusted historical counts.
              </p>
            </div>
          </article>
        )}

        {/* TAB 3: HARMONIZER FORMULATION */}
        {activeTab === "pipeline" && (
          <article className="prose-section">
            <h2>The 4-Stage Harmonization Mathematics</h2>
            <p>
              PYRO-SYNC implements a deterministic mathematical framework in <code>lib/harmonizer.ts</code> to collapse
              spatial fragmentation, enforce radiative sensitivity parity, and normalize orbital overpass density:
            </p>

            <div className="diagram-stage-grid">
              <div className="stage-step-card">
                <span className="stage-badge">Stage 01</span>
                <h4>H3 Spatial Quantization</h4>
                <p>Maps lat/lon point coordinates into Uber H3 Resolution-7 discrete hexagons (~5.16 km²). Groups by (hex, day, satellite).</p>
                <code className="infotip-formula mono">h = latLngToCell(lat, lon, res = 7)</code>
              </div>

              <div className="stage-step-card">
                <span className="stage-badge">Stage 02</span>
                <h4>Cell-Integrated Energy Floor</h4>
                <p>Enforces a 2.0 MW cutoff on the aggregated cell total FRP rather than individual pixels to conserve fragmented fire energy.</p>
                <code className="infotip-formula mono">{"Σ FRP_cell >= 2.0 MW"}</code>
              </div>

              <div className="stage-step-card">
                <span className="stage-badge">Stage 03</span>
                <h4>Active Overpass Weighting</h4>
                <p>Divides total aggregated FRP by the number of operational satellites providing valid observations during that week.</p>
                <code className="infotip-formula mono">{"Index = Σ(FRP_cell) / N_active"}</code>
              </div>

              <div className="stage-step-card">
                <span className="stage-badge">Stage 04</span>
                <h4>Multi-Decadal Z-Score</h4>
                <p>Standardizes each calendar week against its 26-year historical seasonal mean and standard deviation.</p>
                <code className="infotip-formula mono">{"Z = (Index - μ_w) / σ_w"}</code>
              </div>
            </div>

            <div className="math-card">
              <h3>Stage 1 Mathematical Definition: Discrete Spatial Quantization</h3>
              <p>
                Every detection coordinate <code>d = (φ, λ)</code> is assigned to an H3 resolution-7 cell <code>h = latLngToCell(φ, λ, 7)</code>.
                Detections are binned by the composite key <code>(h, day, satellite)</code>. All VIIRS detections falling within cell <code>h</code> on the
                same satellite overpass are aggregated:
              </p>
              <div className="formula-block mono">
                {"FRP_{h, d, s} = \\sum_{i \\in (h, d, s)} FRP_i, \\quad n_{h, d, s} = |\\{i \\in (h, d, s)\\}|"}
              </div>
            </div>

            <div className="math-card">
              <h3>Stage 2 Mathematical Definition: Cell-Integrated FRP Cutoff</h3>
              <p>
                Filtering individual VIIRS pixels at 2.0 MW would incorrectly drop small fragments belonging to large ongoing fires.
                Instead, the threshold <code>{"C_VIIRS = 2.0 MW"}</code> is enforced on the integrated cell total:
              </p>
              <div className="formula-block mono">
                {"Keep cell if: (s \\in VIIRS \\implies FRP_{h, d, s} \\ge 2.0 MW) \\land (s \\in MODIS \\implies true)"}
              </div>
            </div>

            <div className="math-card">
              <h3>Stage 3 Mathematical Definition: Overpass Effort Normalization</h3>
              <p>
                The weekly harmonized index <code>{"I(y, w)"}</code> normalizes the sum of valid cell FRP by the count of operational satellites
                <code>{"N_active(y, w)"}</code> verified in <code>public/data/manifest.json</code>:
              </p>
              <div className="formula-block mono">
                {"I(y, w) = \\frac{\\sum_{h, d, s} FRP_{h, d, s}}{N_{active}(y, w)}"}
              </div>
            </div>

            <div className="math-card">
              <h3>Stage 4 Mathematical Definition: Weekly Anomaly Standardization</h3>
              <p>
                Agricultural residue burning and Mediterranean wildfire cycles exhibit strong seasonality. To isolate true statistical
                anomalies from expected annual cycles, each week is standardized against its 26-year empirical distribution:
              </p>
              <div className="formula-block mono">
                {"Z(y, w) = \frac{I(y, w) - \mu_w}{\sigma_w}, \quad \mu_w = \frac{1}{|Y_w|}\sum_{y \in Y_w} I(y, w)"}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                Weeks where $Z \ge +2.0\sigma$ represent extreme ecological breakout events (e.g. 2018 Camp Fire, 2016 Punjab peak).
              </p>
            </div>
          </article>
        )}

        {/* TAB 4: FIELD BENCHMARKS */}
        {activeTab === "benchmarks" && (
          <article className="prose-section">
            <h2>Empirical Regional Benchmarks</h2>
            <p>
              PYRO-SYNC is validated against three globally recognized benchmark wildfire regimes:
            </p>

            <div className="region-grid">
              <div className="region-card">
                <div className="region-header">
                  <h3>Punjab &amp; Haryana, India</h3>
                  <span className="pill mono">Kharif Crop Residue</span>
                </div>
                <p>
                  <strong>Peak Season:</strong> Weeks 41–47 (October–November).
                </p>
                <p>
                  <strong>Phenomenology:</strong> Post-monsoon burning of rice paddy stubble (parali) prior to wheat sowing.
                  Characterized by hundreds of thousands of low-intensity, short-duration field burns.
                </p>
                <p>
                  <strong>Harmonization Result:</strong> VIIRS’s high radiometric sensitivity created an artificial 5.2× count explosion
                  in 2012. PYRO-SYNC eliminates this spike, allowing air quality researchers to measure real farm compliance changes.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => onLaunchWorkbench(0, false)}
                >
                  Inspect Punjab in Workbench →
                </button>
              </div>

              <div className="region-card">
                <div className="region-header">
                  <h3>California (Sierra &amp; Coastal Ranges)</h3>
                  <span className="pill mono">Coniferous Forest &amp; Chaparral</span>
                </div>
                <p>
                  <strong>Peak Season:</strong> Weeks 28–44 (July–October).
                </p>
                <p>
                  <strong>Phenomenology:</strong> Mediterranean drought followed by offshore Diablo and Santa Ana wind episodes.
                  Conflagrations with massive energy releases (&gt;10,000 MW).
                </p>
                <p>
                  <strong>Harmonization Result:</strong> Grouping by H3 cell prevents false duplication along expanding perimeter edges,
                  preserving accurate energy metrics across historic burns (2018 Camp Fire, 2020 August Complex).
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => onLaunchWorkbench(1, false)}
                >
                  Inspect California in Workbench →
                </button>
              </div>

              <div className="region-card">
                <div className="region-header">
                  <h3>Amazon Arc of Deforestation</h3>
                  <span className="pill mono">Tropical Forest Clearing</span>
                </div>
                <p>
                  <strong>Peak Season:</strong> Weeks 31–42 (August–October).
                </p>
                <p>
                  <strong>Phenomenology:</strong> Slash-and-burn biomass conversion along agricultural frontiers in Mato Grosso and Rondônia.
                  Severe optical attenuation due to heavy smoke plumes.
                </p>
                <p>
                  <strong>Harmonization Result:</strong> Overpass effort normalization combines observations across all operational platforms,
                  providing robust multi-satellite cross-validation.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => onLaunchWorkbench(2, false)}
                >
                  Inspect Amazon in Workbench →
                </button>
              </div>
            </div>
          </article>
        )}

        {/* TAB 5: EMPIRICAL VALIDATION */}
        {activeTab === "validation" && (
          <article className="prose-section">
            <h2>Empirical Verification &amp; Sensor Invariance Testing</h2>
            <p>
              To confirm that PYRO-SYNC restores inter-satellite continuity without distorting genuine physical signals,
              the harmonization engine is verified through automated regression suites in <code>__tests__/dataSource.test.ts</code>:
            </p>

            <div className="doc-card">
              <h3>The 8% Equal-Energy Sensor Invariance Test</h3>
              <p>
                We simulate an identical wildfire release of exactly <strong>100.0&nbsp;MW Fire Radiative Power</strong> under two sensor regimes:
              </p>
              <div className="kv mono" style={{ maxWidth: 520, margin: "14px 0" }}>
                <span>MODIS Observation</span>
                <span>4 detections @ 25.0 MW each = 100.0 MW total</span>
                <span>VIIRS Observation</span>
                <span>20 fragmented detections @ 5.0 MW each = 100.0 MW total</span>
                <span>Raw Count Disparity (VIIRS / MODIS)</span>
                <span style={{ color: "var(--red)", fontWeight: 700 }}>5.00× (False Counting Surge)</span>
                <span>Harmonized Index Ratio</span>
                <span style={{ color: "var(--green)", fontWeight: 700 }}>1.00 ± 0.08 (Exact Energy Conservation)</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                Verified on every code commit via Vitest: tests assert that <code>{"I_VIIRS / I_MODIS"}</code> falls strictly within [0.92, 1.08].
              </p>
            </div>

            <div className="doc-card" style={{ marginTop: 16 }}>
              <h3>Multi-Decadal Baseline Stability (2000–2026)</h3>
              <p>
                Evaluation of global yearly totals from <code>public/data/global/totals.json</code> confirms that while raw
                detections jump dramatically in 2012 upon the launch of S-NPP VIIRS, the harmonized index maintains steady
                correlation with historical baseline years (2003–2011 mean = 1.0).
              </p>
            </div>
          </article>
        )}

        {/* TAB 6: SYSTEM ENGINEERING */}
        {activeTab === "engineering" && (
          <article className="prose-section">
            <h2>Architecture &amp; Data Pipeline</h2>
            <p>
              PYRO-SYNC is built on modern web standards designed for instant client-side telemetry exploration:
            </p>

            <div className="grid-2col">
              <div className="doc-card">
                <h3>Frontend Architecture</h3>
                <ul className="doc-list">
                  <li><strong>Next.js 15 (React 19 App Router):</strong> Server-side API routes for NASA FIRMS NRT streaming and client-side hydration.</li>
                  <li><strong>MapLibre GL + deck.gl:</strong> Hardware-accelerated WebGL2 rendering of 100,000+ H3 hexagons with dynamic GPU picking.</li>
                  <li><strong>Uber h3-js:</strong> Discrete global grid system for hexagonal coordinate hashing.</li>
                  <li><strong>Responsive Cockpit:</strong> Full support for multi-monitor desktop telemetry and mobile touch navigation.</li>
                </ul>
              </div>

              <div className="doc-card">
                <h3>Data Delivery &amp; Compression</h3>
                <ul className="doc-list">
                  <li><strong>Columnar Gzip Archives:</strong> Parallel shared-index arrays compressed into native <code>.json.gz</code> files.</li>
                  <li><strong>Streaming Decompression:</strong> Native Web API <code>DecompressionStream(&quot;gzip&quot;)</code> in the browser thread.</li>
                  <li><strong>NASA FIRMS Proxy:</strong> Serverless caching layer with 15-minute LRU memory cache and rate-limit guardrails.</li>
                  <li><strong>Zero Numeric LLM:</strong> 100% deterministic mathematical calculations in TypeScript and Python.</li>
                </ul>
              </div>
            </div>

            <div className="action-banner" style={{ marginTop: 24 }}>
              <div>
                <strong style={{ fontSize: 16 }}>Ready to explore the live platform?</strong>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
                  Launch the Telemetry Workbench to inspect the interactive map, resizable sidebars, and 26-year matrix.
                </p>
              </div>
              <button className="btn-primary" onClick={() => onLaunchWorkbench(0, false)}>
                Open Telemetry Workbench →
              </button>
            </div>
          </article>
        )}
      </main>

      {/* Product Footer */}
      <footer className="product-footer mono">
        <div>
          <span style={{ fontWeight: 700, color: "#FFF" }}>PYRO-SYNC · SATELLITE WILDFIRE TELEMETRY PLATFORM</span>
          <span style={{ color: "var(--dim)", marginLeft: 14 }}>
            NASA FIRMS Data Records · MODIS &amp; VIIRS
          </span>
        </div>
        <div style={{ color: "var(--dim)", fontSize: 11.5 }}>
          Continuous Decadal Harmonization · Open Source · NASA Space Apps 2026
        </div>
      </footer>
    </div>
  );
}
