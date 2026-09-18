"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { DonutSlice } from "@/components/admin/types";

/**
 * Donut with a value in the hole and a share-of-total legend beside it.
 * Used for both the dashboard's performance bands and the analytics
 * submission-status breakdown; every slice is a real row count.
 */
export function PerformanceDonut({
  slices,
  centerValue,
  centerLabel,
  emptyMessage = "No data yet.",
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  emptyMessage?: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center px-6 text-center text-[13px] text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }}
              formatter={(value: unknown, name: unknown) => [
                `${Number(value)} (${Math.round((Number(value) / total) * 100)}%)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[24px] font-bold leading-none text-zinc-900">{centerValue}</p>
          <p className="mt-1 max-w-[92px] text-center text-[10px] leading-tight text-zinc-400">{centerLabel}</p>
        </div>
      </div>

      <ul className="min-w-[150px] flex-1 space-y-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-zinc-600">{s.name}</span>
            <span className="shrink-0 font-semibold text-zinc-900">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
