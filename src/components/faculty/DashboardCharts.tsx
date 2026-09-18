"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MAROON } from "@/lib/theme";

export type ActivityPoint = { label: string; submitted: number; reviewed: number };
export type StatusSlice = { name: string; value: number; color: string };

/** Daily submitted-vs-reviewed counts over the trailing 30 days. */
export function SubmissionActivityChart({ data }: { data: ActivityPoint[] }) {
  const hasData = data.some((d) => d.submitted > 0 || d.reviewed > 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-zinc-900">Submission Activity (Last 30 Days)</p>
        <div className="flex items-center gap-3">
          <LegendDot color={MAROON[400]} label="Submitted" />
          <LegendDot color={MAROON[700]} label="Reviewed" />
        </div>
      </div>
      {!hasData ? (
        <div className="flex h-[210px] items-center justify-center text-sm text-zinc-400">
          No submission activity in the last 30 days.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e6e9" vertical={false} />
            <XAxis
              dataKey="label"
              interval={6}
              tick={{ fontSize: 10, fill: "#8a7580" }}
              axisLine={{ stroke: "#f0e6e9" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#8a7580" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }} />
            <Line
              type="monotone"
              dataKey="submitted"
              name="Submitted"
              stroke={MAROON[400]}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="reviewed"
              name="Reviewed"
              stroke={MAROON[700]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Donut of submissions by status, with the running total in the middle. */
export function SubmissionStatusDonut({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="mb-3 text-[13px] font-semibold text-zinc-900">Submission Status</p>
      {total === 0 ? (
        <div className="flex h-[210px] items-center justify-center text-sm text-zinc-400">
          No submissions yet.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[22px] font-bold leading-none text-zinc-900">{total}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">Total</p>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1 truncate text-zinc-500">{s.name}</span>
                <span className="font-semibold text-zinc-900">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
