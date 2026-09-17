import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const AT_RISK_INACTIVITY_DAYS = 14;
export const AT_RISK_SCORE_THRESHOLD = 50;

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function computeStudentMetrics(studentId: string) {
  const [submissions, testResponses] = await Promise.all([
    prisma.submission.findMany({ where: { studentId } }),
    prisma.testResponse.findMany({ where: { studentId } }),
  ]);

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s) => s.status === "APPROVED").length;
  const submissionCompletionRate =
    totalSubmissions === 0 ? 0 : (approvedSubmissions / totalSubmissions) * 100;

  const reviewed = submissions.filter((s) => s.reviewedAt);
  const reviewTurnaroundHours = average(
    reviewed.map((s) => hoursBetween(s.createdAt, s.reviewedAt as Date)),
  );

  const scoredResponses = testResponses.filter(
    (r) => r.score !== null && r.maxScore !== null && r.maxScore! > 0,
  );
  const avgTestScorePct = average(
    scoredResponses.map((r) => (r.score! / r.maxScore!) * 100),
  );

  const activityDates = [
    ...submissions.map((s) => s.createdAt),
    ...testResponses.filter((r) => r.submittedAt).map((r) => r.submittedAt as Date),
  ];
  const lastActivityAt =
    activityDates.length > 0
      ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
      : null;
  const daysSinceLastActivity = lastActivityAt
    ? (Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    : Number.POSITIVE_INFINITY;

  const hasTestActivity = scoredResponses.length > 0;
  const atRisk =
    daysSinceLastActivity > AT_RISK_INACTIVITY_DAYS ||
    (hasTestActivity && avgTestScorePct < AT_RISK_SCORE_THRESHOLD);

  return {
    submissionCompletionRate,
    reviewTurnaroundHours,
    avgTestScorePct,
    daysSinceLastActivity: Number.isFinite(daysSinceLastActivity)
      ? daysSinceLastActivity
      : -1,
    atRisk,
    totalSubmissions,
    approvedSubmissions,
  };
}

function kpiKey(params: {
  scope: string;
  batchId?: string | null;
  studentId?: string | null;
  metricName: string;
}): string {
  return [params.scope, params.batchId ?? "-", params.studentId ?? "-", params.metricName].join(
    ":",
  );
}

/**
 * KPI rows are an append-only time series (never overwritten) so both the
 * current value and a historical trend can be read back from the same
 * table. Callers needing "the current value" use getLatestKpis below.
 */
async function recordKpi(params: {
  scope: "STUDENT" | "BATCH" | "COHORT";
  batchId?: string | null;
  studentId?: string | null;
  metricName: string;
  value: number;
}) {
  await prisma.kPI.create({
    data: {
      key: kpiKey(params),
      scope: params.scope,
      batchId: params.batchId ?? null,
      studentId: params.studentId ?? null,
      metricName: params.metricName,
      value: params.value,
    },
  });
}

/** Returns only the most recent row per metric series matching `where`. */
export async function getLatestKpis(where: Prisma.KPIWhereInput) {
  const rows = await prisma.kPI.findMany({ where, orderBy: { computedAt: "desc" } });
  const seen = new Set<string>();
  const latest: typeof rows = [];
  for (const row of rows) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    latest.push(row);
  }
  return latest;
}

export async function recomputeStudentKpis(studentId: string) {
  const membership = await prisma.userBatch.findFirst({ where: { userId: studentId } });
  const batchId = membership?.batchId ?? null;
  const metrics = await computeStudentMetrics(studentId);

  await Promise.all([
    recordKpi({
      scope: "STUDENT",
      studentId,
      batchId,
      metricName: "submission_completion_rate",
      value: metrics.submissionCompletionRate,
    }),
    recordKpi({
      scope: "STUDENT",
      studentId,
      batchId,
      metricName: "avg_test_score_pct",
      value: metrics.avgTestScorePct,
    }),
    recordKpi({
      scope: "STUDENT",
      studentId,
      batchId,
      metricName: "review_turnaround_hours",
      value: metrics.reviewTurnaroundHours,
    }),
    recordKpi({
      scope: "STUDENT",
      studentId,
      batchId,
      metricName: "days_since_last_activity",
      value: metrics.daysSinceLastActivity,
    }),
    recordKpi({
      scope: "STUDENT",
      studentId,
      batchId,
      metricName: "at_risk",
      value: metrics.atRisk ? 1 : 0,
    }),
  ]);

  return metrics;
}

export async function recomputeBatchKpis(batchId: string) {
  const memberships = await prisma.userBatch.findMany({
    where: { batchId, user: { role: "STUDENT" } },
    include: { user: true },
  });

  const perStudent = await Promise.all(
    memberships.map((m) => recomputeStudentKpis(m.userId)),
  );

  const studentCount = perStudent.length;
  const atRiskCount = perStudent.filter((m) => m.atRisk).length;
  const avgCompletionRate = average(perStudent.map((m) => m.submissionCompletionRate));
  const avgTestScore = average(perStudent.map((m) => m.avgTestScorePct));
  const avgTurnaround = average(
    perStudent.map((m) => m.reviewTurnaroundHours).filter((v) => v > 0),
  );
  const totalSubmissions = perStudent.reduce((a, m) => a + m.totalSubmissions, 0);
  const approvedSubmissions = perStudent.reduce((a, m) => a + m.approvedSubmissions, 0);

  await Promise.all([
    recordKpi({ scope: "BATCH", batchId, metricName: "student_count", value: studentCount }),
    recordKpi({ scope: "BATCH", batchId, metricName: "at_risk_count", value: atRiskCount }),
    recordKpi({
      scope: "BATCH",
      batchId,
      metricName: "submission_completion_rate",
      value: avgCompletionRate,
    }),
    recordKpi({ scope: "BATCH", batchId, metricName: "avg_test_score_pct", value: avgTestScore }),
    recordKpi({
      scope: "BATCH",
      batchId,
      metricName: "review_turnaround_hours",
      value: avgTurnaround,
    }),
    recordKpi({
      scope: "BATCH",
      batchId,
      metricName: "total_submissions",
      value: totalSubmissions,
    }),
    recordKpi({
      scope: "BATCH",
      batchId,
      metricName: "approved_submissions",
      value: approvedSubmissions,
    }),
  ]);
}

export async function recomputeCohortKpis() {
  const batches = await prisma.batch.findMany();
  // Only the latest snapshot per batch/metric — KPI is an append-only log,
  // so a plain findMany would double-count every historical recompute.
  const batchKpis = await getLatestKpis({
    scope: "BATCH",
    metricName: {
      in: [
        "student_count",
        "at_risk_count",
        "submission_completion_rate",
        "avg_test_score_pct",
        "review_turnaround_hours",
      ],
    },
  });

  const byMetric = (name: string) =>
    batchKpis.filter((k) => k.metricName === name).map((k) => k.value);

  const totalStudents = byMetric("student_count").reduce((a, b) => a + b, 0);
  const totalAtRisk = byMetric("at_risk_count").reduce((a, b) => a + b, 0);

  await Promise.all([
    recordKpi({ scope: "COHORT", metricName: "batch_count", value: batches.length }),
    recordKpi({ scope: "COHORT", metricName: "student_count", value: totalStudents }),
    recordKpi({ scope: "COHORT", metricName: "at_risk_count", value: totalAtRisk }),
    recordKpi({
      scope: "COHORT",
      metricName: "submission_completion_rate",
      value: average(byMetric("submission_completion_rate")),
    }),
    recordKpi({
      scope: "COHORT",
      metricName: "avg_test_score_pct",
      value: average(byMetric("avg_test_score_pct")),
    }),
    recordKpi({
      scope: "COHORT",
      metricName: "review_turnaround_hours",
      value: average(byMetric("review_turnaround_hours").filter((v) => v > 0)),
    }),
  ]);
}

/** Full recompute chain: call after any review/scoring action affecting a student. */
export async function recomputeKpisForStudentChange(studentId: string) {
  const membership = await prisma.userBatch.findFirst({ where: { userId: studentId } });
  if (membership) {
    await recomputeBatchKpis(membership.batchId);
  } else {
    await recomputeStudentKpis(studentId);
  }
  await recomputeCohortKpis();
}
