"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts";
import { MAROON } from "@/lib/theme";
import type { DistributionBucket } from "./TestAnalytics";

const BUCKET_FILL = [MAROON[400], MAROON[500], MAROON[600], MAROON[700], MAROON[800]];

/** Score-distribution bar chart for a test. Loaded lazily via LazyCharts. */
export function ScoreDistributionChart({ distribution }: { distribution: DistributionBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={distribution} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6e9" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 10, fill: "#8a7580" }}
          axisLine={{ stroke: "#f0e6e9" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#8a7580" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ fill: "rgba(107,16,41,0.04)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }}
        />
        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#8a7580" }} />
          {distribution.map((d, i) => (
            <Cell key={d.bucket} fill={BUCKET_FILL[i] ?? MAROON[600]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
