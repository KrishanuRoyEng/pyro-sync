"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Label } from "recharts";

export interface YearPoint { year: number; raw: number; harmonized: number }

export default function HarmonizationProofChart({ data }: { data: YearPoint[] }) {
  return (
    <div style={{ height: 190 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#22262C" />
          <XAxis dataKey="year" stroke="#8B929C" tick={{ fontSize: 10 }} />
          <YAxis stroke="#8B929C" tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: "#0B0C0E", border: "1px solid #22262C", borderRadius: 0, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            formatter={(v: number) => v.toFixed(2)}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {/* 2012 VIIRS launch annotation — prominent */}
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
          <Line name="Raw hotspot count" dataKey="raw" stroke="#DC2626" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          <Line name="Harmonized thermal index" dataKey="harmonized" stroke="#F3F4F6" dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10, color: "#8B929C", textAlign: "center", marginTop: 2 }}>
        Raw count jumps at 2012 (VIIRS pixel fragmentation); harmonized index stays continuous
      </div>
    </div>
  );
}
