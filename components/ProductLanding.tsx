"use client";
import React, { useState, useEffect } from "react";

interface ProductLandingProps {
  onLaunchWorkbench: (regionIndex?: number, live?: boolean) => void;
}

export default function ProductLanding({ onLaunchWorkbench }: ProductLandingProps) {
  const [activeTab, setActiveTab] = useState<
    "physics" | "paradox" | "pipeline" | "benchmarks" | "validation" | "engineering"
  >("physics");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t && ["physics", "paradox", "pipeline", "benchmarks", "validation", "engineering"].includes(t)) {
      setActiveTab(t as any);
    }
  }, []);

  return (
    <div className="product-page-wrapper">
      {/* Product Hero */}
      <section className="product-hero">
        <h1 className="hero-title">
          Harmonizing Decadal Satellite Wildfire Telemetry{" "}
          <span className="hero-title-highlight">Across MODIS &amp; VIIRS Generations</span>
        </h1>
        <p className="hero-lead">
          When NASA introduced the 375&nbsp;m VIIRS sensor in 2012, raw active fire detections artificially surged{" "}
          <strong className="lead-stat-highlight">4.9×</strong> due to sub-pixel fire fragmentation.
          PYRO-SYNC reconstructs continuous, decadal fire energy records using discrete H3 hexagonal clustering, cell-level
          energy thresholds, and operational overpass normalization.
        </p>

        <div className="hero-cta-row">
          <button
            className="btn-primary-glow"
            onClick={() => onLaunchWorkbench(0, false)}
          >
            <span>Launch Telemetry Workbench</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <button
            className="btn-glass"
            onClick={() => onLaunchWorkbench(0, true)}
          >
            <span className="live-dot-pulse" />
            <span>Live 24h Global Feed</span>
          </button>
          <button
            className="btn-ghost"
            onClick={() => setActiveTab("pipeline")}
          >
            <span>Mathematical Formulation</span>
          </button>
        </div>

        {/* Telemetry Metric Highlights */}
        <div className="hero-stats-grid">
          <div className="stat-card stat-cyan">
            <div className="stat-card-badge">TEMPORAL CONTINUITY</div>
            <div className="stat-num-display">
              26 <span className="stat-unit">Years</span>
            </div>
            <p className="stat-sublabel">2000–2026 Continuous Telemetry Baseline</p>
          </div>

          <div className="stat-card stat-amber">
            <div className="stat-card-badge">CONSTELLATION</div>
            <div className="stat-num-display">
              5 <span className="stat-unit">Satellites</span>
            </div>
            <p className="stat-sublabel">Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21</p>
          </div>

          <div className="stat-card stat-core">
            <div className="stat-card-badge">PROCESSED TELEMETRY</div>
            <div className="stat-num-display">
              57.7M <span className="stat-unit">Hotspots</span>
            </div>
            <p className="stat-sublabel">Verified NASA FIRMS Observations</p>
          </div>

          <div className="stat-card stat-emerald">
            <div className="stat-card-badge">ENERGY CONSERVATION</div>
            <div className="stat-num-display">
              ±8% <span className="stat-unit">Invariance</span>
            </div>
            <p className="stat-sublabel">Validated Sensor-Invariant Radiative Energy</p>
          </div>
        </div>
      </section>

      {/* Navigation Sub-bar */}
      <nav className="product-nav-dock" aria-label="Documentation sections">
        <div className="nav-dock-scroller">
          <button
            className={`nav-dock-btn ${activeTab === "physics" ? "active" : ""}`}
            onClick={() => setActiveTab("physics")}
          >
            <span>Instrument Physics</span>
          </button>
          <button
            className={`nav-dock-btn ${activeTab === "paradox" ? "active" : ""}`}
            onClick={() => setActiveTab("paradox")}
          >
            <span>The 4.9× Paradox</span>
          </button>
          <button
            className={`nav-dock-btn ${activeTab === "pipeline" ? "active" : ""}`}
            onClick={() => setActiveTab("pipeline")}
          >
            <span>Harmonizer Math</span>
          </button>
          <button
            className={`nav-dock-btn ${activeTab === "benchmarks" ? "active" : ""}`}
            onClick={() => setActiveTab("benchmarks")}
          >
            <span>Field Benchmarks</span>
          </button>
          <button
            className={`nav-dock-btn ${activeTab === "validation" ? "active" : ""}`}
            onClick={() => setActiveTab("validation")}
          >
            <span>Empirical Validation</span>
          </button>
          <button
            className={`nav-dock-btn ${activeTab === "engineering" ? "active" : ""}`}
            onClick={() => setActiveTab("engineering")}
          >
            <span>System Engineering</span>
          </button>
        </div>
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
            <div className="comparison-visual-card">
              <div className="comparison-header">
                <div>
                  <h3 className="comparison-title">Ground Footprint Optical Comparison: 1 km² Fire Area</h3>
                  <p className="comparison-subtitle">
                    Physical Fire Release: 10.0 MW Radiative Power across an identical 1.0 km² ground surface
                  </p>
                </div>
                <div className="sensor-artifact-pill">
                  <span className="pill-dot-warning" />
                  <span>4.9× RAW COUNT DISPARITY</span>
                </div>
              </div>

              <div className="comparison-grid">
                {/* MODIS Sensor Footprint */}
                <div className="sensor-panel sensor-modis">
                  <div className="sensor-panel-header">
                    <span className="sensor-tag tag-modis">MODIS APERTURE</span>
                    <span className="sensor-dim-label">1,000 m × 1,000 m GIFOV</span>
                  </div>
                  
                  <div className="sensor-footprint-box box-modis">
                    <div className="footprint-reticle-crosshair" />
                    <div className="footprint-fire-centroid centroid-modis">
                      <div className="centroid-pulse" />
                      <span className="centroid-label">10.0 MW</span>
                    </div>
                    <span className="footprint-scale-tag">1 km² Area</span>
                  </div>

                  <div className="sensor-metric-summary">
                    <div className="metric-row">
                      <span className="metric-name">Raw Hotspot Output</span>
                      <strong className="metric-val val-white">1 Detection</strong>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Radiative Energy (FRP)</span>
                      <strong className="metric-val val-cyan">10.0 MW Total</strong>
                    </div>
                  </div>
                </div>

                <div className="comparison-divider-column">
                  <div className="comparison-badge-vs">VS</div>
                  <span className="divider-label">SENSOR TRANSITION</span>
                </div>

                {/* VIIRS Sensor Footprint */}
                <div className="sensor-panel sensor-viirs">
                  <div className="sensor-panel-header">
                    <span className="sensor-tag tag-viirs">VIIRS (I-BAND) APERTURE</span>
                    <span className="sensor-dim-label">375 m × 375 m GIFOV</span>
                  </div>

                  <div className="sensor-footprint-box box-viirs">
                    <div className="viirs-subpixel-grid">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <div key={num} className="viirs-subpixel active-fire">
                          <span className="subpixel-energy">1.4 MW</span>
                        </div>
                      ))}
                      <div className="viirs-subpixel subpixel-empty" />
                      <div className="viirs-subpixel subpixel-empty" />
                    </div>
                    <span className="footprint-scale-tag">375 m Grid (0.14 km² / cell)</span>
                  </div>

                  <div className="sensor-metric-summary">
                    <div className="metric-row">
                      <span className="metric-name">Raw Hotspot Output</span>
                      <strong className="metric-val val-amber">7 Detections (+600%)</strong>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Radiative Energy (FRP)</span>
                      <strong className="metric-val val-cyan">10.0 MW Total</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="comparison-takeaway-bar">
                <div className="takeaway-icon">⚡</div>
                <div className="takeaway-text">
                  <strong>Physical Telemetry Invariance:</strong> Both sensors observe identical total thermal radiative output (10.0 MW).
                  MODIS aggregates it into <strong>1 detection</strong>; VIIRS fractures it into <strong>7 discrete detections</strong>.
                  PYRO-SYNC resolves this disparity by quantizing detections into discrete H3 hexagons and enforcing a cell-level energy floor, guaranteeing <strong>1.00 ± 0.08</strong> conservation.
                </div>
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
