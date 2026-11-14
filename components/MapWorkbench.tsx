"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { HexCell } from "@/lib/harmonizer";
import { ramp, RAMP_STOPS, RAMP_LABELS } from "@/lib/ramp";

interface Props {
  hexes: HexCell[];
  center: [number, number];
  zoom: number;
  selected: string | null;
  onPick: (hex: string | null) => void;
  liveMode?: boolean;
  selectedWeekLabel?: string;
}

interface TooltipInfo {
  x: number;
  y: number;
  hex: string;
  count: number;
  frp: number;
  density: number;
}

export default function MapWorkbench({
  hexes,
  center,
  zoom,
  selected,
  onPick,
  liveMode,
  selectedWeekLabel,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  useEffect(() => {
    const m = new maplibregl.Map({
      container: el.current!,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });
    m.addControl(new maplibregl.AttributionControl({ compact: true }));
    overlay.current = new MapboxOverlay({ interleaved: false, layers: [] });
    m.addControl(overlay.current as unknown as maplibregl.IControl);
    map.current = m;

    m.on("load", () => {
      m.resize();
    });

    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver to ensure MapLibre adjusts dynamically whenever container changes size
  useEffect(() => {
    if (!el.current) return;
    const ro = new ResizeObserver(() => {
      map.current?.resize();
    });
    ro.observe(el.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    map.current?.flyTo({ center: [center[1], center[0]], zoom, duration: 600 });
  }, [center, zoom]);

  useEffect(() => {
    const max = Math.max(1e-6, ...hexes.map((h) => h.density));
    overlay.current?.setProps({
      layers: [
        new H3HexagonLayer<HexCell>({
          id: "hex",
          data: hexes,
          pickable: true,
          extruded: false,
          filled: true,
          stroked: true,
          getHexagon: (d) => d.hex,
          getFillColor: (d) => [...ramp(Math.sqrt(d.density / max)), 210] as [number, number, number, number],
          getLineColor: (d) => (d.hex === selected ? [243, 244, 246, 255] : [11, 12, 14, 120]),
          getLineWidth: (d) => (d.hex === selected ? 2 : 1),
          lineWidthUnits: "pixels" as const,
          updateTriggers: { getLineColor: selected, getLineWidth: selected },
          onClick: (info) => pick.current(info.object && info.object.hex !== selected ? info.object.hex : null),
          onHover: (info) => {
            if (info.object) {
              setTooltip({
                x: info.x,
                y: info.y,
                hex: info.object.hex,
                count: info.object.count,
                frp: info.object.frp,
                density: info.object.density,
              });
            } else {
              setTooltip(null);
            }
          },
        }),
      ],
    });
  }, [hexes, selected]);

  const maxDensity = Math.max(0, ...hexes.map((h) => h.density));

  return (
    <div
      ref={el}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Selected Week Indicator Pill over Map */}
      {selectedWeekLabel && (
        <div
          className="mono"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            padding: "4px 8px",
            fontSize: 11,
            pointerEvents: "none",
          }}
        >
          <span style={{ color: "var(--dim)" }}>Viewing: </span>
          <span style={{ color: "var(--core)", fontWeight: 600 }}>{selectedWeekLabel}</span>
          {hexes.length > 0 && (
            <span style={{ color: "var(--dim)", marginLeft: 8 }}>
              ({hexes.length.toLocaleString()} active cells)
            </span>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div className="map-legend" aria-label="FRP density legend">
        <div
          style={{
            fontSize: 10,
            color: "var(--dim)",
            marginBottom: 4,
            fontWeight: 600,
            letterSpacing: "0.05em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>FRP DENSITY</span>
          <span>MW / km²</span>
        </div>
        <div style={{ display: "flex", height: 8 }}>
          {RAMP_STOPS.map((color, i) => (
            <div key={i} style={{ flex: 1, background: color }} />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "var(--dim)",
            marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>0.0</span>
          <span>{(maxDensity * 0.25).toFixed(1)}</span>
          <span>{(maxDensity * 0.5).toFixed(1)}</span>
          <span>{maxDensity > 0 ? maxDensity.toFixed(1) : "max"}</span>
        </div>
      </div>

      {/* Hex Tooltip */}
      {tooltip && (
        <div
          className="hex-tooltip mono"
          style={{ left: tooltip.x + 12, top: tooltip.y - 45 }}
          role="tooltip"
        >
          <div style={{ fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{tooltip.hex}</div>
          <div>
            <span style={{ color: "var(--dim)" }}>Detections: </span>
            {Math.round(tooltip.count).toLocaleString()}
          </div>
          <div>
            <span style={{ color: "var(--dim)" }}>FRP: </span>
            {tooltip.frp.toFixed(1)} MW
          </div>
          <div>
            <span style={{ color: "var(--dim)" }}>FRP per km²: </span>
            {tooltip.density.toFixed(2)} MW/km²
          </div>
        </div>
      )}
    </div>
  );
}
