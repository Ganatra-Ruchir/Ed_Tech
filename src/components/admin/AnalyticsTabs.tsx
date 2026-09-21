"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { CategoryBarChart } from "@/components/admin/CategoryBarChart";
import { PerformanceDonut } from "@/components/admin/PerformanceDonut";
import type { BarPoint, DonutSlice } from "@/components/admin/types";

export type AnalyticsTabsData = {
  submissionStatus: DonutSlice[];
  totalSubmissions: number;
  scoreDistribution: BarPoint[];
  avgScoreByBatch: BarPoint[];
  completionByBatch: BarPoint[];
  performance: DonutSlice[];
  avgScorePct: number;
  scoredStudentCount: number;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Student performance" },
  { id: "batches", label: "Batch comparison" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/[0.02]">
      <p className="text-[13px] font-semibold text-zinc-900">{title}</p>
      {subtitle && <p className="mb-3 mt-0.5 text-[11px] text-zinc-400">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

export function AnalyticsTabs({ data }: { data: AnalyticsTabsData }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === t.id ? "text-white" : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="admin-analytics-tab"
                className="absolute inset-0 rounded-md bg-[#ef5b3f]"
                transition={{ type: "spring", stiffness: 500, damping: 42 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Submission status" subtitle={`${data.totalSubmissions} submissions on record`}>
            <PerformanceDonut
              slices={data.submissionStatus}
              centerValue={String(data.totalSubmissions)}
              centerLabel="Total submissions"
              emptyMessage="No submissions recorded yet."
            />
          </Panel>
          <Panel
            title="Score distribution"
            subtitle={`Students grouped by their mean test score (${data.scoredStudentCount} scored)`}
          >
            <CategoryBarChart
              data={data.scoreDistribution}
              emptyMessage="No graded test responses yet."
            />
          </Panel>
        </div>
      )}

      {tab === "students" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel
            title="Performance bands"
            subtitle={`Based on ${data.scoredStudentCount} students with at least one graded test`}
          >
            <PerformanceDonut
              slices={data.performance}
              centerValue={`${Math.round(data.avgScorePct)}%`}
              centerLabel="Average score"
              emptyMessage="No graded test responses yet."
            />
          </Panel>
          <Panel title="Students per score band" subtitle="Mean test score across all graded responses">
            <CategoryBarChart data={data.scoreDistribution} emptyMessage="No graded test responses yet." />
          </Panel>
        </div>
      )}

      {tab === "batches" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Average test score by batch" subtitle="Latest recorded batch KPI">
            <CategoryBarChart
              data={data.avgScoreByBatch}
              unit="%"
              domainMax={100}
              emptyMessage="No batch score KPIs recorded yet."
            />
          </Panel>
          <Panel title="Submission completion by batch" subtitle="Share of a batch's submissions that are approved">
            <CategoryBarChart
              data={data.completionByBatch}
              unit="%"
              domainMax={100}
              emptyMessage="No batch completion KPIs recorded yet."
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
