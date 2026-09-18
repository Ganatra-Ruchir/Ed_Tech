"use client";

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { MAROON } from "@/lib/theme";

/** A single-value donut gauge in the Silver Oak maroon, used for the
 * overall-progress and average-score readouts on the student report. */
export function ProgressRing({
  value,
  caption,
  height = 150,
}: {
  /** 0-100 */
  value: number;
  caption?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            barSize={12}
            data={[{ value: clamped, fill: MAROON[600] }]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "#f3e7ea" }} dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-2xl font-bold text-zinc-900">{clamped.toFixed(0)}%</p>
        </div>
      </div>
      {caption && <p className="mt-1 text-center text-[11px] text-zinc-400">{caption}</p>}
    </div>
  );
}

export type TrendPointView = {
  date: string;
  submission_completion_rate?: number;
  avg_test_score_pct?: number;
};

const SERIES = [
  { key: "submission_completion_rate", label: "Submission approval %", color: MAROON[600] },
  { key: "avg_test_score_pct", label: "Avg test score %", color: "#d97706" },
] as const;

/** Your own KPI history over time, in the portal's maroon palette. */
export function ScoreTrend({ points }: { points: TrendPointView[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center px-6 text-center text-[13px] text-zinc-400">
        Your trend appears here once more of your work has been reviewed and scored.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6e9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a7580" }} axisLine={{ stroke: "#f0e6e9" }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8a7580" }} axisLine={false} tickLine={false} width={32} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }} formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2.5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
