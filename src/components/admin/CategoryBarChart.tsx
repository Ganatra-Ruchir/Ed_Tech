"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { MAROON } from "@/lib/theme";
import type { BarPoint } from "@/components/admin/types";

/** Simple categorical bar chart used for the analytics score distribution
 * and per-batch comparisons. `unit` is appended in the tooltip/labels. */
export function CategoryBarChart({
  data,
  unit = "",
  height = 220,
  emptyMessage = "No data yet.",
  domainMax,
}: {
  data: BarPoint[];
  unit?: string;
  height?: number;
  emptyMessage?: string;
  domainMax?: number;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center px-6 text-center text-[13px] text-zinc-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6e9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#8a7580" }}
          axisLine={{ stroke: "#f0e6e9" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          domain={domainMax ? [0, domainMax] : undefined}
          tick={{ fontSize: 10, fill: "#8a7580" }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip
          cursor={{ fill: "rgba(107,16,41,0.05)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }}
          formatter={(value: unknown) => `${Number(value)}${unit}`}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={MAROON[600]} maxBarSize={48}>
          <LabelList
            dataKey="value"
            position="top"
            fontSize={10}
            fill="#8a7580"
            formatter={(v: unknown) => `${Number(v)}${unit}`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
