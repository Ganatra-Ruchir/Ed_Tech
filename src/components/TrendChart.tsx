"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TrendPoint } from "@/lib/dashboard";

const SERIES = [
  { key: "submission_completion_rate", label: "Submission completion %", color: "#2a78d6" },
  { key: "avg_test_score_pct", label: "Avg test score %", color: "#eb6834" },
] as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function TrendChart({ history }: { history: TrendPoint[] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
        Not enough data yet to show a trend. Trends appear as reviews and test scores are recorded.
      </div>
    );
  }

  const byDate = new Map<string, Record<string, number | string>>();
  for (const point of history) {
    const label = fmtDate(point.computedAt);
    if (!byDate.has(label)) byDate.set(label, { date: label });
    byDate.get(label)![point.metricName] = Math.round(point.value * 10) / 10;
  }
  const data = [...byDate.values()];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => `${value}%`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
