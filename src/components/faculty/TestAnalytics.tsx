"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts";
import { CheckCircle2, AlertTriangle, Info, Inbox } from "lucide-react";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { cn } from "@/lib/cn";
import { MAROON } from "@/lib/theme";
import { fmtDate } from "@/components/faculty/faculty-format";

export type TestStats = {
  assigned: number;
  submitted: number;
  scoredCount: number;
  avgScorePct: number | null;
  below50: number;
};
export type DistributionBucket = { bucket: string; count: number };
export type Insight = { text: string; tone: "good" | "warn" | "info" };
export type ResultRow = {
  id: string;
  studentName: string;
  score: number | null;
  maxScore: number | null;
  scorePct: number | null;
  submittedAt: string | null;
  ungraded: number;
};
export type QuestionRow = {
  id: string;
  index: number;
  text: string;
  type: string;
  graded: number;
  correct: number;
};

/** Ordered buckets get an ordered (sequential) ramp, lightest to darkest. */
const BUCKET_FILL = [MAROON[400], MAROON[500], MAROON[600], MAROON[700], MAROON[800]];

const TABS = ["Overview", "Student Results", "Question Analysis"] as const;
type Tab = (typeof TABS)[number];

const INSIGHT_ICON = { good: CheckCircle2, warn: AlertTriangle, info: Info } as const;
const INSIGHT_TONE = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  info: "text-sky-600",
} as const;

export function TestAnalytics({
  stats,
  distribution,
  insights,
  results,
  questions,
}: {
  stats: TestStats;
  distribution: DistributionBucket[];
  insights: Insight[];
  results: ResultRow[];
  questions: QuestionRow[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const submittedPct = stats.assigned > 0 ? (stats.submitted / stats.assigned) * 100 : 0;
  const hasScores = stats.scoredCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              tab === t
                ? "border-[#ef5b3f] text-[#ef5b3f]"
                : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile value={String(stats.assigned)} label="Students Assigned" />
            <Tile
              value={String(stats.submitted)}
              label="Submissions"
              sub={stats.assigned > 0 ? `${submittedPct.toFixed(0)}%` : undefined}
              subTone="emerald"
            />
            <Tile
              value={hasScores ? `${stats.avgScorePct!.toFixed(0)}%` : "—"}
              label="Average Score"
              sub={hasScores ? undefined : "No graded responses"}
            />
            <Tile
              value={String(stats.below50)}
              label="Below 50%"
              tone={stats.below50 > 0 ? "rose" : "default"}
            />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-3">
              <p className="mb-3 text-[13px] font-semibold text-zinc-900">Score Distribution</p>
              {!hasScores ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-zinc-400">
                  Scores appear here once responses are graded.
                </div>
              ) : (
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
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
              <p className="mb-3 text-[13px] font-semibold text-zinc-900">Performance Insights</p>
              {insights.length === 0 ? (
                <p className="text-xs text-zinc-400">Insights appear once responses are graded.</p>
              ) : (
                <ul className="space-y-2.5">
                  {insights.map((insight) => {
                    const Icon = INSIGHT_ICON[insight.tone];
                    return (
                      <li key={insight.text} className="flex items-start gap-2 text-[12px] text-zinc-600">
                        <Icon size={13} className={cn("mt-0.5 shrink-0", INSIGHT_TONE[insight.tone])} />
                        {insight.text}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "Student Results" && (
        <Card className="overflow-hidden">
          {results.length === 0 ? (
            <EmptyState icon={Inbox} title="No responses yet" description="Results appear as students submit." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50/95 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Student</th>
                    <th className="px-3 py-2.5 font-medium">Score</th>
                    <th className="px-3 py-2.5 font-medium">Percentage</th>
                    <th className="px-3 py-2.5 font-medium">Submitted</th>
                    <th className="px-3 py-2.5 font-medium">Grading</th>
                    <th className="px-3 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50/80">
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <Avatar name={r.studentName} size="sm" />
                          <span className="truncate text-[13px] font-medium text-zinc-900">{r.studentName}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-zinc-700">
                        {r.score ?? "-"} / {r.maxScore ?? "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.scorePct === null ? (
                          <span className="text-[13px] text-zinc-400">—</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <ProgressBar value={r.scorePct} tone="auto" className="w-16" />
                            <span className="text-[12.5px] font-medium text-zinc-700">
                              {r.scorePct.toFixed(0)}%
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-zinc-500">
                        {fmtDate(r.submittedAt)}
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px]">
                        {r.ungraded > 0 ? (
                          <span className="text-amber-700">{r.ungraded} pending</span>
                        ) : (
                          <span className="text-emerald-700">Done</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/faculty/test-responses/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#ef5b3f]/20 bg-[#ef5b3f]/[0.06] px-2.5 py-1 text-xs font-medium text-[#ef5b3f] transition-colors hover:bg-[#ef5b3f] hover:text-white"
                        >
                          {r.ungraded > 0 ? "Grade" : "View"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "Question Analysis" && (
        <Card className="overflow-hidden">
          {questions.length === 0 ? (
            <EmptyState icon={Inbox} title="This test has no questions yet" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {questions.map((q) => {
                const accuracy = q.graded > 0 ? (q.correct / q.graded) * 100 : null;
                return (
                  <li key={q.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-[13px] text-zinc-800">
                        <span className="font-semibold text-zinc-900">Q{q.index}.</span> {q.text}
                      </p>
                      <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-zinc-500">
                        {q.type.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar value={accuracy ?? 0} tone={accuracy === null ? "brand" : "auto"} className="max-w-xs flex-1" />
                      <span className="shrink-0 text-[12px] text-zinc-500">
                        {accuracy === null
                          ? "Not graded yet"
                          : `${accuracy.toFixed(0)}% correct · ${q.correct}/${q.graded} graded`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function Tile({
  value,
  label,
  sub,
  subTone = "zinc",
  tone = "default",
}: {
  value: string;
  label: string;
  sub?: string;
  subTone?: "zinc" | "emerald";
  tone?: "default" | "rose";
}) {
  return (
    <div className={cn("rounded-lg border border-zinc-200 bg-white p-4", tone === "rose" && "bg-rose-50/60")}>
      <p className={cn("text-2xl font-bold tracking-tight", tone === "rose" ? "text-rose-600" : "text-zinc-900")}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-zinc-500">{label}</p>
      {sub && (
        <p className={cn("mt-1 text-[11px] font-semibold", subTone === "emerald" ? "text-emerald-600" : "text-zinc-400")}>
          {sub}
        </p>
      )}
    </div>
  );
}
