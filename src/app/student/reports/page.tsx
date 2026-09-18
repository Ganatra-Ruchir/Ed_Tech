import {
  FileText,
  FileDown,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { Tag } from "@/components/Tag";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { DownloadReportButton } from "@/components/student/DownloadReportButton";
import { ProgressRing, ScoreTrend, type TrendPointView } from "@/components/student/ReportCharts";

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const TREND_METRICS = ["submission_completion_rate", "avg_test_score_pct"] as const;

export default async function StudentReportsPage() {
  const session = await getSession();
  const studentId = session!.sub;
  const batchIds = await userBatchIds(studentId);

  const [student, submissions, assignedTests, responses, kpis, reports, history, feedbackCount, evidence] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: studentId },
        include: { batchMemberships: { include: { batch: true } } },
      }),
      prisma.submission.findMany({ where: { studentId }, select: { status: true } }),
      prisma.test.findMany({
        where: { publishedAt: { not: null }, batchId: { in: batchIds } },
        select: { id: true },
      }),
      prisma.testResponse.findMany({
        where: { studentId },
        select: { testId: true, score: true, maxScore: true },
      }),
      getLatestKpis({ scope: "STUDENT", studentId }),
      prisma.report.findMany({ where: { studentId }, orderBy: { generatedAt: "desc" } }),
      prisma.kPI.findMany({
        where: { scope: "STUDENT", studentId, metricName: { in: [...TREND_METRICS] } },
        orderBy: { computedAt: "asc" },
      }),
      prisma.feedback.count({
        where: { OR: [{ submission: { studentId } }, { testResponse: { studentId } }] },
      }),
      prisma.evidence.findMany({
        where: { OR: [{ submission: { studentId } }, { testResponse: { studentId } }] },
        select: { tag: true },
      }),
    ]);

  const batch = student.batchMemberships[0]?.batch ?? null;
  const kpiByName = Object.fromEntries(kpis.map((k) => [k.metricName, k.value]));
  const avgScorePct = kpiByName["avg_test_score_pct"] ?? 0;

  const approvedSubmissions = submissions.filter((s) => s.status === "APPROVED").length;
  const assignedTestIds = new Set(assignedTests.map((t) => t.id));
  const completedTests = responses.filter((r) => assignedTestIds.has(r.testId)).length;

  // "Overall progress" is an average of the two completion rates that the
  // data actually supports — submission approval and test completion.
  // Denominators of zero are left out rather than counted as failure.
  const progressParts: number[] = [];
  if (submissions.length > 0) progressParts.push((approvedSubmissions / submissions.length) * 100);
  if (assignedTests.length > 0) progressParts.push((completedTests / assignedTests.length) * 100);
  const overallProgress =
    progressParts.length > 0 ? progressParts.reduce((a, b) => a + b, 0) / progressParts.length : 0;

  const byDate = new Map<string, TrendPointView>();
  for (const point of history) {
    const label = point.computedAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    if (!byDate.has(label)) byDate.set(label, { date: label });
    byDate.get(label)![point.metricName as (typeof TREND_METRICS)[number]] =
      Math.round(point.value * 10) / 10;
  }
  const trendPoints = [...byDate.values()];

  const tagCounts = new Map<string, number>();
  for (const e of evidence) tagCounts.set(e.tag, (tagCounts.get(e.tag) ?? 0) + 1);
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  const tiles = [
    {
      label: "Submissions",
      value: `${approvedSubmissions} / ${submissions.length}`,
      hint: "Approved out of submitted",
      icon: ClipboardCheck,
      wrap: "bg-emerald-50/70",
      chip: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Tests Completed",
      value: `${completedTests} / ${assignedTests.length}`,
      hint: "Out of tests assigned to you",
      icon: ClipboardList,
      wrap: "bg-violet-50/70",
      chip: "bg-violet-100 text-violet-600",
    },
    {
      label: "Avg. Test Score",
      value: `${avgScorePct.toFixed(0)}%`,
      hint: avgScorePct >= 60 ? "Above average performance." : "Room to grow — keep practicing.",
      icon: BarChart3,
      wrap: "bg-amber-50/70",
      chip: "bg-amber-100 text-amber-600",
    },
    {
      label: "Feedback Received",
      value: String(feedbackCount),
      hint: "Comments from your faculty",
      icon: MessageSquare,
      wrap: "bg-sky-50/70",
      chip: "bg-sky-100 text-sky-600",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Progress Report"
        description="Your complete academic and project journey, in one place."
        actions={<DownloadReportButton studentId={studentId} />}
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar name={student.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-zinc-900">{student.name}</p>
              <p className="truncate text-[12.5px] text-zinc-500">
                {batch ? `${batch.department} · ${batch.name} · Semester ${batch.semester}` : "No batch assigned yet"}
              </p>
              <p className="truncate text-[11.5px] text-zinc-400">{student.email}</p>
            </div>
          </div>
          <div className="min-w-[220px] flex-1 sm:max-w-xs">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Overall Progress</p>
              <p className="text-xl font-bold text-zinc-900">{overallProgress.toFixed(0)}%</p>
            </div>
            <ProgressBar
              value={overallProgress}
              className="mt-2 !bg-[#6b1029]/10 [&>div]:!bg-[#6b1029]"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">
              Average of your submission approval and test completion rates.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className={`rounded-lg p-4 ${t.wrap}`}>
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-500">{t.label}</p>
                  <p className="text-xl font-bold text-zinc-900">{t.value}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-zinc-500">{t.hint}</p>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <TrendingUp size={13} className="text-[#6b1029]" /> Progress Over Time
          </p>
          <ScoreTrend points={trendPoints} />
        </Card>

        <Card className="flex flex-col justify-center p-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Average Test Score
          </p>
          <ProgressRing
            value={avgScorePct}
            caption={
              completedTests === 0
                ? "Complete a test to see your score."
                : `Across ${completedTests} completed test${completedTests === 1 ? "" : "s"}.`
            }
          />
        </Card>
      </div>

      {tags.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
            <Sparkles size={14} className="text-[#6b1029]" /> Evidence Recognised by Faculty
          </h2>
          <Card className="p-4">
            <ul className="flex flex-wrap gap-2">
              {tags.map(([tag, count]) => (
                <li key={tag} className="flex items-center gap-1.5">
                  <Tag label={tag} />
                  <span className="text-[11px] font-medium text-zinc-400">×{count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
          <FileText size={14} className="text-[#6b1029]" /> Generated Reports
        </h2>
        <Card>
          {reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports generated yet"
              description="Use Download PDF above to create a full progress report."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#6b1029]/[0.08] text-[#6b1029]">
                      <FileText size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-900">Progress report (PDF)</p>
                      <p className="truncate text-[11px] text-zinc-400">Generated {fmtDateTime(r.generatedAt)}</p>
                    </div>
                  </div>
                  <a
                    href={r.pdfPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <FileDown size={13} /> View PDF
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
