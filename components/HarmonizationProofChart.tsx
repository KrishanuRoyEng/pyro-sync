"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Label,
} from "recharts";

export interface YearPoint {
  year: number;
  raw: number;
  harmonized: number;
  rawCount?: number;
  harmFRP?: number;
}

interface Props {
  data: YearPoint[];
  hasViirs?: boolean;
  baselineLabel?: string;
}

export default function HarmonizationProofChart({
  data,
  hasViirs = false,
  baselineLabel = "2003–2011 mean = 1.0",
}: Props) {
  return (
    <div style={{ height: 210, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "'JetBrains Mono', monospace" }}>
          {baselineLabel}
        </span>
        {!hasViirs && (
          <span
            className="pill mono"
            style={{ fontSize: 9, borderColor: "var(--amber)", color: "var(--amber)", padding: "1px 5px" }}
          >
            VIIRS data not loaded yet
          </span>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#22262C" />
            <XAxis dataKey="year" stroke="#8B929C" tick={{ fontSize: 10 }} />
            <YAxis stroke="#8B929C" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "#0B0C0E",
                border: "1px solid #22262C",
                borderRadius: 0,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              formatter={(v: number, name: string) => [
                v.toFixed(2),
                name === "raw" ? "Raw hotspot count" : "Harmonized thermal index",
              ]}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />

            {/* Annotate 2012 VIIRS SNPP start ONLY if VIIRS data exists in the manifest */}
            {hasViirs && (
              <ReferenceLine
                x={2012}
                stroke="#D97706"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              >
                <Label
                  value="← VIIRS SNPP launch"
                  position="insideTopRight"
                  fill="#D97706"
                  fontSize={10}
                  fontWeight={600}
                  offset={4}
                />
              </ReferenceLine>
            )}

            <Line
              name="Raw hotspot count"
              dataKey="raw"
              stroke="#DC2626"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Line
              name="Harmonized thermal index"
              dataKey="harmonized"
              stroke="#F3F4F6"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 10, color: "#8B929C", textAlign: "center", marginTop: 4 }}>
        {hasViirs
          ? "Raw count jumps at 2012 (VIIRS pixel fragmentation); harmonized index stays continuous"
          : "Aqua launch in 2002 doubles raw counts; harmonized index normalizes by active satellite effort"}
      </div>
    </div>
  );
}
