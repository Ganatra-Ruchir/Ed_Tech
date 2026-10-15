"use client";

import dynamic from "next/dynamic";

/**
 * Lazy versions of every Recharts-based chart.
 *
 * Recharts is by far the largest client dependency. Importing it statically
 * put it in the critical JS of every dashboard, delaying hydration (buttons,
 * menus, search) until it had downloaded and parsed. Charts also can't render
 * on the server — ResponsiveContainer needs a measured width — so nothing is
 * lost by deferring them. Each one reserves its height while loading so the
 * page doesn't jump.
 *
 * Import charts from here, not from their source files.
 */

function ChartPlaceholder({ height }: { height: number }) {
  return <div className="animate-skeleton-pulse w-full rounded-md bg-[#f1efec]" style={{ height }} aria-hidden="true" />;
}

const placeholder = (height: number) => {
  function Loading() {
    return <ChartPlaceholder height={height} />;
  }
  return Loading;
};

export const TrendChart = dynamic(() => import("@/components/TrendChart").then((m) => m.TrendChart), {
  ssr: false,
  loading: placeholder(300),
});

export const PerformanceDonut = dynamic(() => import("@/components/admin/PerformanceDonut").then((m) => m.PerformanceDonut), {
  ssr: false,
  loading: placeholder(220),
});

export const CategoryBarChart = dynamic(() => import("@/components/admin/CategoryBarChart").then((m) => m.CategoryBarChart), {
  ssr: false,
  loading: placeholder(220),
});

export const SubmissionTrendChart = dynamic(
  () => import("@/components/admin/SubmissionTrendChart").then((m) => m.SubmissionTrendChart),
  { ssr: false, loading: placeholder(240) },
);

export const SubmissionActivityChart = dynamic(
  () => import("@/components/faculty/DashboardCharts").then((m) => m.SubmissionActivityChart),
  { ssr: false, loading: placeholder(270) },
);

export const SubmissionStatusDonut = dynamic(
  () => import("@/components/faculty/DashboardCharts").then((m) => m.SubmissionStatusDonut),
  { ssr: false, loading: placeholder(270) },
);

export const TestPerformanceCharts = dynamic(
  () => import("@/components/student/TestPerformanceCharts").then((m) => m.TestPerformanceCharts),
  { ssr: false, loading: placeholder(240) },
);

export const ProgressRing = dynamic(() => import("@/components/student/ReportCharts").then((m) => m.ProgressRing), {
  ssr: false,
  loading: placeholder(170),
});

export const ScoreTrend = dynamic(() => import("@/components/student/ReportCharts").then((m) => m.ScoreTrend), {
  ssr: false,
  loading: placeholder(240),
});

export const ScoreDistributionChart = dynamic(
  () => import("@/components/faculty/ScoreDistributionChart").then((m) => m.ScoreDistributionChart),
  { ssr: false, loading: placeholder(200) },
);
