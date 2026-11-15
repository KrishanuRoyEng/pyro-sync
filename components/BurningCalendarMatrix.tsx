"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { YEAR0 } from "@/lib/harmonizer";
import { ramp } from "@/lib/ramp";

interface Props {
  z: (number | null)[][];
  value: (number | null)[][];
  selected: { y: number; w: number };
  threshold: number;
  onlyAnomalies: boolean;
  onSelect: (y: number, w: number) => void;
}
const L = 34,
  T = 14;

export default function BurningCalendarMatrix({
  z,
  value,
  selected,
  threshold,
  onlyAnomalies,
  onSelect,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ y: number; w: number } | null>(null);

  const geom = useCallback(() => {
    const c = ref.current;
    if (!c) return { r: { left: 0, top: 0, width: 1, height: 1 } as DOMRect, cw: 1, ch: 1 };
    const r = c.getBoundingClientRect();
    return {
      r,
      cw: Math.max(1, (r.width - L) / 52),
      ch: Math.max(1, (r.height - T) / (z.length || 1)),
    };
  }, [z.length]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const draw = () => {
      const { r, cw, ch } = geom();
      if (r.width <= 0 || r.height <= 0) return;
      c.width = Math.max(1, r.width * dpr);
      c.height = Math.max(1, r.height * dpr);
      const x = c.getContext("2d");
      if (!x) return;
      x.scale(dpr, dpr);
      x.fillStyle = "#10141D";
      x.fillRect(0, 0, r.width, r.height);
      x.font = "9.5px 'JetBrains Mono', monospace";
      x.textBaseline = "middle";

      z.forEach((row, y) => {
        if (y % 2 === 0) {
          x.fillStyle = "#94A3B8";
          x.textAlign = "right";
          x.fillText(String(YEAR0 + y), L - 4, T + y * ch + ch / 2);
        }
        row.forEach((v, w) => {
          if (v === null) {
            // Null weeks (e.g. observation gaps or pre-MODIS launch): subtle hatched pattern
            x.fillStyle = "#181E29";
            x.fillRect(L + w * cw, T + y * ch, Math.max(1, cw - 1), Math.max(1, ch - 1));
            return;
          }
          const hot = v >= threshold;
          x.fillStyle = `rgb(${ramp((v + 1) / 5.5).join(",")})`;
          x.globalAlpha = onlyAnomalies && !hot ? 0.12 : 1;
          x.fillRect(L + w * cw, T + y * ch, Math.max(1, cw - 1), Math.max(1, ch - 1));
        });
      });

      x.globalAlpha = 1;
      x.fillStyle = "#94A3B8";
      x.textAlign = "left";
      for (let w = 0; w < 52; w += 4) {
        x.fillText(`W${w + 1}`, L + w * cw, 6);
      }

      // Selection indicator
      x.strokeStyle = "#F8FAFC";
      x.lineWidth = 1.5;
      x.strokeRect(L + selected.w * cw - 0.5, T + selected.y * ch - 0.5, cw + 1, ch + 1);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [z, selected, threshold, onlyAnomalies, geom]);

  const at = (e: React.MouseEvent) => {
    const { r, cw, ch } = geom();
    const w = Math.floor((e.clientX - r.left - L) / cw);
    const y = Math.floor((e.clientY - r.top - T) / ch);
    return w >= 0 && w < 52 && y >= 0 && y < z.length && z[y][w] !== null ? { y, w } : null;
  };

  const touchAt = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return null;
    const touch = e.touches[0];
    const { r, cw, ch } = geom();
    const w = Math.floor((touch.clientX - r.left - L) / cw);
    const y = Math.floor((touch.clientY - r.top - T) / ch);
    return w >= 0 && w < 52 && y >= 0 && y < z.length && z[y][w] !== null ? { y, w } : null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    let { y, w } = selected;
    if (e.key === "ArrowLeft") {
      w = Math.max(0, w - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      w = Math.min(51, w + 1);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      y = Math.max(0, y - 1);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      y = Math.min(z.length - 1, y + 1);
      e.preventDefault();
    } else if (e.key === "Home") {
      w = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      w = 51;
      e.preventDefault();
    } else {
      return;
    }
    onSelect(y, w);
  };

  const h = hover ?? selected;
  const zv = z[h.y]?.[h.w];
  const vv = value[h.y]?.[h.w];

  return (
    <>
      <canvas
        ref={ref}
        role="grid"
        tabIndex={0}
        aria-label="Burning activity calendar, years by week. Use arrow keys to navigate."
        onKeyDown={onKeyDown}
        onMouseMove={(e) => setHover(at(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const p = at(e);
          if (p) onSelect(p.y, p.w);
        }}
        onTouchStart={(e) => {
          const p = touchAt(e);
          if (p) {
            setHover(p);
            onSelect(p.y, p.w);
          }
        }}
        onTouchMove={(e) => {
          const p = touchAt(e);
          if (p) {
            setHover(p);
            onSelect(p.y, p.w);
          }
        }}
      />
      <div
        className="mono"
        style={{
          color: "var(--dim)",
          paddingTop: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11.5,
        }}
      >
        <span>
          <strong style={{ color: "#FFF" }}>{YEAR0 + h.y} W{h.w + 1}</strong> &nbsp;
          <span>Harmonized FRP: {vv == null ? "—" : vv.toFixed(1)} MW</span> &nbsp;
          <span>
            Z-Score:{" "}
            <span style={{ color: zv != null && zv >= threshold ? "var(--red)" : "var(--amber)", fontWeight: 700 }}>
              {zv == null ? "—" : (zv >= 0 ? "+" : "") + zv.toFixed(2)}σ
            </span>
          </span>
        </span>
        <span style={{ fontSize: 10, color: "var(--dim)" }}>
          Touch or Arrow keys to select week
        </span>
      </div>
    </>
  );
}
