"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { MAROON } from "@/lib/theme";

export type ScorePoint = { name: string; scorePct: number };

export function TestPerformanceCharts({ scores, averagePct }: { scores: ScorePoint[]; averagePct: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:col-span-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Your Test Performance</p>
        {scores.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
            Scores will appear here once you complete a test.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scores} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6e9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8a7580" }} axisLine={{ stroke: "#f0e6e9" }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8a7580" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #f0e6e9" }} formatter={(v) => `${v}%`} />
              <Bar dataKey="scorePct" radius={[4, 4, 0, 0]} fill={MAROON[600]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Average Score</p>
        <div className="relative h-[140px] w-full">
          <ResponsiveContainer width="100%" height={140}>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              barSize={12}
              data={[{ value: averagePct, fill: MAROON[600] }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: "#f3e7ea" }} dataKey="value" cornerRadius={6} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-2xl font-bold text-zinc-900">{averagePct.toFixed(0)}%</p>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">Keep going — you&apos;re doing well.</p>
      </div>
    </div>
  );
}
