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
import { MAROON } from "@/lib/theme";
import type { TrendPoint } from "@/components/admin/types";

/** Submissions created vs. submissions reviewed, bucketed by calendar month
 * over the trailing six months. Both series are raw row counts. */
export function SubmissionTrendChart({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => d.submitted > 0 || d.reviewed > 0);

  if (!hasData) {
    return (
      <div className="flex h-[240px] items-center justify-center px-6 text-center text-[13px] text-zinc-400">
        No submissions recorded in the last six months yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6e9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#8a7580" }}
          axisLine={{ stroke: "#f0e6e9" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#8a7580" }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="submitted"
          name="Submitted"
          stroke={MAROON[700]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="reviewed"
          name="Reviewed"
          stroke={MAROON[400]}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
