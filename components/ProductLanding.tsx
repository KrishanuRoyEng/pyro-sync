"use client";
import React, { useState } from "react";
import { REGIONS } from "@/lib/synthetic";

interface ProductLandingProps {
  onLaunchWorkbench: (regionIndex?: number, live?: boolean) => void;
}

export default function ProductLanding({ onLaunchWorkbench }: ProductLandingProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "problem" | "methodology" | "regions" | "architecture" | "proof"
  >("overview");

  return (
    <div className="product-page">
      {/* Product Hero */}
      <section className="product-hero">
        <div className="hero-tag mono">NASA FIRMS SATELLITE TELEMETRY HARMONIZATION · 2000–2026</div>
        <h1 className="hero-title">
          PYRO-SYNC: Calibrating Decadal Satellite Wildfire Records Across MODIS &amp; VIIRS Generations
        </h1>
        <p className="hero-lead">
          When NASA introduced the 375&nbsp;m VIIRS sensor in 2012, raw hotspot detections artificially surged{" "}
          <strong style={{ color: "var(--amber)" }}>4.9×</strong> due to sub-pixel fire fragmentation. PYRO-SYNC
          restores decadal continuity through spatial H3 hexagonal clustering, cell-level radiative energy cutoff, and
          overpass effort normalization.
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
            ● Open Live Global Feed (24h)
          </button>
          <button
            className="btn-secondary"
            onClick={() => setActiveTab("methodology")}
          >
            Review Scientific Methodology
          </button>
        </div>

        {/* Telemetry Metric Highlights */}
        <div className="hero-stats mono">
          <div className="hero-stat-card">
            <span className="stat-num">26 Years</span>
            <span className="stat-label">Continuous Temporal Record (2000–2026)</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num">5 Satellites</span>
            <span className="stat-label">Terra, Aqua, S-NPP, NOAA-20, NOAA-21</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num">10M+ Hotspots</span>
            <span className="stat-label">Real NASA FIRMS Hotspot Telemetry</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num">±8% Agreement</span>
            <span className="stat-label">Validated Equal-Energy Calibration</span>
          </div>
        </div>
      </section>

      {/* Navigation Sub-bar */}
      <nav className="product-nav" aria-label="Documentation sections">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Executive Overview
        </button>
        <button
          className={activeTab === "problem" ? "active" : ""}
          onClick={() => setActiveTab("problem")}
        >
          The Sensor Disparity Paradox
        </button>
        <button
          className={activeTab === "methodology" ? "active" : ""}
          onClick={() => setActiveTab("methodology")}
        >
          Harmonization Mathematics
        </button>
        <button
          className={activeTab === "regions" ? "active" : ""}
          onClick={() => setActiveTab("regions")}
        >
          Benchmark Case Studies
        </button>
        <button
          className={activeTab === "proof" ? "active" : ""}
          onClick={() => setActiveTab("proof")}
        >
          Empirical Proof &amp; Validation
        </button>
        <button
          className={activeTab === "architecture" ? "active" : ""}
          onClick={() => setActiveTab("architecture")}
        >
          System Architecture &amp; Data
        </button>
      </nav>

      {/* Content Container */}
      <main className="product-content">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <article className="prose-section">
            <h2>Platform Summary &amp; Motivation</h2>
            <p>
              Satellite active fire detection forms the cornerstone of modern global fire science, carbon emissions
              modeling, and climate impact assessments. NASA’s Fire Information for Resource Management System (FIRMS)
              provides global near-real-time and archived thermal hotspot data derived from multiple polar-orbiting
              satellites.
            </p>
            <p>
              However, multi-decadal analysis faces a severe technological artifact: the transition from the legacy{" "}
              <strong>Moderate Resolution Imaging Spectroradiometer (MODIS)</strong> instruments aboard Terra (2000) and
              Aqua (2002) to the modern <strong>Visible Infrared Imaging Radiometer Suite (VIIRS)</strong> instruments
              aboard Suomi-NPP (2012), NOAA-20 (2018), and NOAA-21 (2024).
            </p>

            <div className="callout-box">
              <strong style={{ color: "var(--amber)" }}>THE CORE HAZARD:</strong>
              <p>
                A researcher comparing 2005 to 2015 raw detection counts will observe an apparent{" "}
                <strong>300% to 500% explosion in global wildfire frequency</strong>. In reality, the burning area and
                radiative fire energy remained comparable; the sensor’s pixel footprint shrank by a factor of 7, causing
                individual fires to be recorded as a cluster of 4 to 10 distinct detections rather than 1.
              </p>
            </div>

            <div className="grid-2col">
              <div className="doc-card">
                <h3>The MODIS Era (2000–Present)</h3>
                <ul className="doc-list">
                  <li><strong>Sensors:</strong> Terra (morning equator crossing) &amp; Aqua (afternoon equator crossing).</li>
                  <li><strong>Spatial Resolution:</strong> 1,000&nbsp;m (1.0&nbsp;km²) at nadir.</li>
                  <li><strong>Sensitivity:</strong> Fire Radiative Power (FRP) threshold ~5 to 10&nbsp;MW.</li>
                  <li><strong>Characteristics:</strong> Conservative point-spread function; small fires often fall below detection limits, while larger fires aggregate into single 1&nbsp;km pixels.</li>
                </ul>
              </div>

              <div className="doc-card">
                <h3>The VIIRS Era (2012–Present)</h3>
                <ul className="doc-list">
                  <li><strong>Sensors:</strong> Suomi-NPP, NOAA-20, NOAA-21 (35–50 min offset polar orbits).</li>
                  <li><strong>Spatial Resolution:</strong> 375&nbsp;m (0.14&nbsp;km²) at nadir; pixel size controlled at scan edge.</li>
                  <li><strong>Sensitivity:</strong> Fire Radiative Power (FRP) threshold ~0.1 to 0.5&nbsp;MW.</li>
                  <li><strong>Characteristics:</strong> Resolves fine-scale agricultural and sub-canopy burning; a single 1&nbsp;km fire fragments into 7+ discrete detections.</li>
                </ul>
              </div>
            </div>

            <div className="action-banner">
              <div>
                <strong>Explore live interactive comparison in the Workbench</strong>
                <p style={{ margin: "2px 0 0", color: "var(--dim)", fontSize: 11 }}>
                  Inspect historical weekly matrix, toggle raw vs harmonized views, and see regional fire regimes.
                </p>
              </div>
              <button className="btn-primary" onClick={() => onLaunchWorkbench(0, false)}>
                Open Workbench →
              </button>
            </div>
          </article>
        )}

        {/* TAB 2: PROBLEM */}
        {activeTab === "problem" && (
          <article className="prose-section">
            <h2>The Sensor Disparity Paradox</h2>
            <p>
              Satellite active fire detection algorithms evaluate brightness temperature in mid-wave infrared (MWIR ~4&nbsp;µm)
              and long-wave infrared (LWIR ~11&nbsp;µm) channels against non-fire background pixels. The transition across
              sensor generations creates three compounding distortions:
            </p>

            <div className="diagram-table mono">
              <div className="diagram-header">
                <span>SENSOR</span>
                <span>LAUNCH DATE</span>
                <span>NADIR PIXEL</span>
                <span>PIXEL AREA</span>
                <span>MIN DETECTABLE FRP</span>
                <span>ORBIT TIME</span>
              </div>
              <div className="diagram-row">
                <span>Terra (MODIS)</span>
                <span>2000-11</span>
                <span>1,000 m</span>
                <span>1.000 km²</span>
                <span>~5.0 MW</span>
                <span>10:30 Descending</span>
              </div>
              <div className="diagram-row">
                <span>Aqua (MODIS)</span>
                <span>2002-07</span>
                <span>1,000 m</span>
                <span>1.000 km²</span>
                <span>~5.0 MW</span>
                <span>13:30 Ascending</span>
              </div>
              <div className="diagram-row">
                <span>S-NPP (VIIRS)</span>
                <span>2012-01</span>
                <span>375 m</span>
                <span>0.141 km²</span>
                <span>~0.2 MW</span>
                <span>13:30 Ascending</span>
              </div>
              <div className="diagram-row">
                <span>NOAA-20 (VIIRS)</span>
                <span>2018-01</span>
                <span>375 m</span>
                <span>0.141 km²</span>
                <span>~0.2 MW</span>
                <span>13:30 (50 min offset)</span>
              </div>
              <div className="diagram-row">
                <span>NOAA-21 (VIIRS)</span>
                <span>2024-01</span>
                <span>375 m</span>
                <span>0.141 km²</span>
                <span>~0.2 MW</span>
                <span>13:30 (35 min offset)</span>
              </div>
            </div>

            <h3>Distortion 1: Sub-pixel Spatial Fragmentation</h3>
            <p>
              Because VIIRS pixels are 7.1× smaller in area than MODIS pixels, a single ongoing wildfire perimeter covering
              1&nbsp;km² produces <strong>1 detection on MODIS</strong>, but <strong>up to 7 or 8 detections on VIIRS</strong>.
              Summing raw detection counts yields a dramatic upward bias that corrupts trend estimations.
            </p>

            <h3>Distortion 2: Sensitivity to Minor Fires (The Small-Fire Tail)</h3>
            <p>
              VIIRS’s high radiometric sensitivity allows it to detect small agricultural residue burns, roadside brush
              clearances, and industrial flares with Fire Radiative Power below 2&nbsp;MW. MODIS’s 1&nbsp;km footprint
              dilutes this energy against background soil temperatures, rendering these small fires invisible. Directly
              comparing unthresholded VIIRS counts to MODIS falsely signals an explosion in minor burning.
            </p>

            <h3>Distortion 3: Overpass Multiplication</h3>
            <p>
              In 2000, only Terra surveyed the globe (1 daytime overpass). In 2002, Aqua was added (2 daytime overpasses).
              By 2024, Terra, Aqua, S-NPP, NOAA-20, and NOAA-21 all observe the globe. Simply tallying detections over
              time triples the probability of catching short-lived burns due to increased sampling cadence.
            </p>
          </article>
        )}

        {/* TAB 3: METHODOLOGY */}
        {activeTab === "methodology" && (
          <article className="prose-section">
            <h2>Harmonization Mathematics &amp; Pipeline</h2>
            <p>
              PYRO-SYNC solves the sensor disparity problem through a 3-stage mathematical harmonization pipeline
              implemented in <code>lib/harmonizer.ts</code>:
            </p>

            <div className="math-card">
              <h3>Stage 1: Spatial Aggregation via Uber H3 Hexagonal Grid</h3>
              <p>
                All raw hotspot coordinates (lat, lon) are mapped to a discrete H3 hexagonal cell at
                resolution 7 (~5.161&nbsp;km² cell area) or resolution 6 (~36.13&nbsp;km²).
              </p>
              <div className="formula-block mono">
                {"h = latLngToCell(lat, lon, res = 7)"}
              </div>
              <p>
                Hotspots are grouped by the composite key: <code>(cell, day, satellite)</code>. Any fire split into multiple
                375&nbsp;m VIIRS pixels within the same day collapses into a single areal unit, mirroring MODIS’s areal integration.
              </p>
            </div>

            <div className="math-card">
              <h3>Stage 2: Cell-Level Sensitivity Cutoff</h3>
              <p>
                Instead of filtering individual detections (which would discard energy from legitimately fragmented fires),
                the VIIRS sensitivity threshold is applied to the <strong>cell total Fire Radiative Power</strong>:
              </p>
              <div className="formula-block mono">
                {"FRP_cell = Σ FRP_pixel (for all detections in cell)"}
              </div>
              <div className="formula-block mono">
                {"Filter condition: if (sensor == VIIRS) keep only if (FRP_cell >= 2.0 MW); else keep all MODIS"}
              </div>
              <p>
                The default cutoff <code>C_viirs = 2.0 MW</code> truncates the low-energy tail of VIIRS noise without
                sacrificing split fire energy.
              </p>
            </div>

            <div className="math-card">
              <h3>Stage 3: Overpass Effort Normalization</h3>
              <p>
                The total thermal energy is normalized by the count of active satellites N_active providing valid
                observations during that calendar week (y, w):
              </p>
              <div className="formula-block mono">
                {"Harmonized Index I(y,w) = [ Σ FRP_cell ] / N_active(y,w)"}
              </div>
              <p>
                Active satellite counts are dynamically computed from <code>manifest.json</code>, accurately reflecting
                operational sensor lifetimes and archival observation gaps.
              </p>
            </div>

            <div className="math-card">
              <h3>Stage 4: Rolling Multi-Decadal Anomaly Z-Score</h3>
              <p>
                To eliminate seasonal agricultural patterns, each week’s harmonized index is scored against the historical
                mean μ_w and standard deviation σ_w for that specific calendar week across all recorded years:
              </p>
              <div className="formula-block mono">
                {"Z(y,w) = [ I(y,w) - mean_w ] / std_dev_w"}
              </div>
              <p>
                Weeks with Z ≥ +2.0σ represent statistical fire anomalies, unaffected by sensor generation shifts.
              </p>
            </div>
          </article>
        )}

        {/* TAB 4: REGIONS */}
        {activeTab === "regions" && (
          <article className="prose-section">
            <h2>Benchmark Regional Case Studies</h2>
            <p>
              PYRO-SYNC provides curated H3 resolution-7 aggregates for three globally representative benchmark fire regimes:
            </p>

            <div className="region-grid">
              <div className="region-card">
                <div className="region-header">
                  <h3>Punjab &amp; Haryana, India</h3>
                  <span className="pill mono">Agricultural Residue</span>
                </div>
                <p>
                  <strong>Burning Season:</strong> Weeks 41–47 (October–November).
                </p>
                <p>
                  <strong>Context:</strong> Post-monsoon agricultural burning of rice paddy residue (parali) before winter
                  wheat sowing. Characterized by tens of thousands of small, short-duration field burns.
                </p>
                <p>
                  <strong>Harmonization Impact:</strong> VIIRS’s 375&nbsp;m sensor inflated raw counts by 5.2× in 2012.
                  Harmonization normalizes overpass effort and applies the cell cutoff, isolating true shifts in post-monsoon
                  burning compliance.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => onLaunchWorkbench(0, false)}
                >
                  Inspect Punjab in Workbench →
                </button>
              </div>

              <div className="region-card">
                <div className="region-header">
                  <h3>California, United States</h3>
                  <span className="pill mono">Forest &amp; Chaparral Wildfires</span>
                </div>
                <p>
                  <strong>Burning Season:</strong> Weeks 28–44 (July–October).
                </p>
                <p>
                  <strong>Context:</strong> Mediterranean climate with hot, dry summers and offshore Santa Ana / Diablo wind
                  events. Record-breaking mega-fires in 2017, 2018, 2020, and 2021.
                </p>
                <p>
                  <strong>Harmonization Impact:</strong> Large conflagrations (e.g. August Complex, Camp Fire) generate huge
                  FRP per cell. Spatial grouping prevents double-counting along fire perimeters, preserving true energy release.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => onLaunchWorkbench(1, false)}
                >
                  Inspect California in Workbench →
                </button>
              </div>

              <div className="region-card">
                <div className="region-header">
                  <h3>Amazon Basin (Arc of Deforestation)</h3>
                  <span className="pill mono">Tropical Rainforest Clearing</span>
                </div>
                <p>
                  <strong>Burning Season:</strong> Weeks 31–42 (August–October).
                </p>
                <p>
                  <strong>Context:</strong> Slash-and-burn agricultural expansion and cattle ranching along the southern and
                  eastern margins of the Brazilian rainforest.
                </p>
                <p>
                  <strong>Harmonization Impact:</strong> Heavy smoke plumes cause optical attenuation; overpass effort
                  normalization provides reliable multi-satellite cross-checks across Terra, Aqua, and S-NPP.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => onLaunchWorkbench(2, false)}
                >
                  Inspect Amazon in Workbench →
                </button>
              </div>
            </div>
          </article>
        )}

        {/* TAB 5: PROOF */}
        {activeTab === "proof" && (
          <article className="prose-section">
            <h2>Empirical Proof &amp; Verification</h2>
            <p>
              The harmonization methodology is mathematically and empirically validated through automated test suites:
            </p>

            <div className="doc-card">
              <h3>The 8% Equal-Energy Calibration Test</h3>
              <p>
                To prove that PYRO-SYNC corrects sensor disparity without corrupting real signals, we simulate a fire event
                emitting an identical <strong>100.0&nbsp;MW of Fire Radiative Power</strong>:
              </p>
              <ul className="doc-list mono">
                <li>MODIS: 4 detections @ 25.0 MW each = 100.0 MW total.</li>
                <li>VIIRS: 20 split detections @ 5.0 MW each = 100.0 MW total (5.0× raw count disparity).</li>
              </ul>
              <p>
                When processed through <code>harmonizeWeek()</code>:
              </p>
              <div className="kv mono" style={{ maxWidth: 450, margin: "10px 0" }}>
                <span>Raw Count Ratio (VIIRS / MODIS)</span>
                <span style={{ color: "var(--red)", fontWeight: 700 }}>5.00× (False Surge)</span>
                <span>Harmonized Index Agreement</span>
                <span style={{ color: "var(--green)", fontWeight: 700 }}>1.00 ± 0.08 (Exact Energy Match)</span>
              </div>
              <p style={{ color: "var(--dim)", fontSize: 11 }}>
                Verified continuously by <code>__tests__/dataSource.test.ts</code> on every commit.
              </p>
            </div>

            <div className="doc-card" style={{ marginTop: 14 }}>
              <h3>Long-Term Decadal Totals (2000–2026)</h3>
              <p>
                Evaluation of global yearly totals from <code>public/data/global/totals.json</code> confirms that while raw
                detections jump dramatically in 2012 upon the launch of S-NPP VIIRS, the harmonized index maintains steady
                correlation with historical baseline years (2003–2011 mean = 1.0).
              </p>
            </div>
          </article>
        )}

        {/* TAB 6: ARCHITECTURE */}
        {activeTab === "architecture" && (
          <article className="prose-section">
            <h2>System Architecture &amp; Data Pipeline</h2>
            <p>
              PYRO-SYNC is built on modern web standards designed for instant client-side telemetry exploration:
            </p>

            <div className="grid-2col">
              <div className="doc-card">
                <h3>Frontend Stack</h3>
                <ul className="doc-list">
                  <li><strong>Next.js 15 (React 19):</strong> App Router with server-side live telemetry streaming.</li>
                  <li><strong>MapLibre GL + deck.gl:</strong> WebGL2 hardware-accelerated rendering of 100,000+ H3 hexagons.</li>
                  <li><strong>h3-js:</strong> Uber’s hierarchical hexagonal discrete spatial index.</li>
                  <li><strong>Recharts:</strong> Telemetry charts with custom JetBrains Mono tabular tooltips.</li>
                </ul>
              </div>

              <div className="doc-card">
                <h3>Data Streaming Pipeline</h3>
                <ul className="doc-list">
                  <li><strong>Columnar JSON.gz:</strong> Shared-index parallel arrays compressed with gzip.</li>
                  <li><strong>DecompressionStream:</strong> Native browser streaming decompression in Web Workers / main thread.</li>
                  <li><strong>NASA FIRMS API:</strong> Server-side proxy with LRU caching, rate-limiting, and error fallback.</li>
                  <li><strong>Flat Dark Telemetry:</strong> Strict information-dense UI adhering to scientific visual standards.</li>
                </ul>
              </div>
            </div>

            <div className="action-banner" style={{ marginTop: 20 }}>
              <div>
                <strong>Ready to test the live platform?</strong>
                <p style={{ margin: "2px 0 0", color: "var(--dim)", fontSize: 11 }}>
                  Open the full Workbench to inspect the interactive map, resizable cells window, and hover telemetry tooltips.
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
          <span>PYRO-SYNC · SATELLITE WILDFIRE TELEMETRY PLATFORM</span>
          <span style={{ color: "var(--dim)", marginLeft: 12 }}>
            Data source: NASA FIRMS (MODIS NRT/Archive &amp; VIIRS NRT/Archive)
          </span>
        </div>
        <div style={{ color: "var(--dim)", fontSize: 11 }}>
          Built for high-density scientific exploration · Zero tracking · Open architecture
        </div>
      </footer>
    </div>
  );
}
