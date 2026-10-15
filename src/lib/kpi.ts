import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { KPIScope } from "@/generated/prisma/enums";

export const AT_RISK_INACTIVITY_DAYS = 14;
export const AT_RISK_SCORE_THRESHOLD = 50;

/**
 * Metrics whose history is never charted. Their value drifts every time a
 * recompute runs (it is "days since X"), so logging it would add a history row
 * per student on every single review without carrying any information.
 */
const LATEST_ONLY_METRICS = new Set(["days_since_last_activity"]);

const DAY_MS = 1000 * 60 * 60 * 24;

type KpiInput = {
  scope: KPIScope;
  batchId?: string | null;
  studentId?: string | null;
  metricName: string;
  value: number;
};

type StudentMetrics = {
  submissionCompletionRate: number;
  reviewTurnaroundHours: number;
  avgTestScorePct: number;
  daysSinceLastActivity: number;
  atRisk: boolean;
  totalSubmissions: number;
  approvedSubmissions: number;
};

type SubmissionRow = { studentId: string; status: string; createdAt: Date; reviewedAt: Date | null };
type ResponseRow = { studentId: string; score: number | null; maxScore: number | null; submittedAt: Date | null };

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function kpiKey(params: Omit<KpiInput, "value">): string {
  return [params.scope, params.batchId ?? "-", params.studentId ?? "-", params.metricName].join(":");
}

/** Pure scoring for one student from already-loaded rows (no queries). */
function scoreStudent(submissions: SubmissionRow[], responses: ResponseRow[], now: number): StudentMetrics {
  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s) => s.status === "APPROVED").length;
  const submissionCompletionRate = totalSubmissions === 0 ? 0 : (approvedSubmissions / totalSubmissions) * 100;

  const reviewTurnaroundHours = average(
    submissions
      .filter((s) => s.reviewedAt)
      .map((s) => Math.abs((s.reviewedAt as Date).getTime() - s.createdAt.getTime()) / (1000 * 60 * 60)),
  );

  const scored = responses.filter((r) => r.score !== null && r.maxScore !== null && r.maxScore > 0);
  const avgTestScorePct = average(scored.map((r) => (r.score! / r.maxScore!) * 100));

  let lastActivity = 0;
  for (const s of submissions) lastActivity = Math.max(lastActivity, s.createdAt.getTime());
  for (const r of responses) if (r.submittedAt) lastActivity = Math.max(lastActivity, r.submittedAt.getTime());
  const daysSinceLastActivity = lastActivity > 0 ? (now - lastActivity) / DAY_MS : Number.POSITIVE_INFINITY;

  const atRisk =
    daysSinceLastActivity > AT_RISK_INACTIVITY_DAYS ||
    (scored.length > 0 && avgTestScorePct < AT_RISK_SCORE_THRESHOLD);

  return {
    submissionCompletionRate,
    reviewTurnaroundHours,
    avgTestScorePct,
    daysSinceLastActivity: Number.isFinite(daysSinceLastActivity) ? daysSinceLastActivity : -1,
    atRisk,
    totalSubmissions,
    approvedSubmissions,
  };
}

/** Two queries total, however many students are passed in. */
async function computeStudentsMetrics(studentIds: string[]): Promise<Map<string, StudentMetrics>> {
  const out = new Map<string, StudentMetrics>();
  if (studentIds.length === 0) return out;

  const [submissions, responses] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true, createdAt: true, reviewedAt: true },
    }),
    prisma.testResponse.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, score: true, maxScore: true, submittedAt: true },
    }),
  ]);

  const subsBy = new Map<string, SubmissionRow[]>();
  for (const s of submissions) {
    const list = subsBy.get(s.studentId);
    if (list) list.push(s);
    else subsBy.set(s.studentId, [s]);
  }
  const respBy = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const list = respBy.get(r.studentId);
    if (list) list.push(r);
    else respBy.set(r.studentId, [r]);
  }

  const now = Date.now();
  for (const id of studentIds) {
    out.set(id, scoreStudent(subsBy.get(id) ?? [], respBy.get(id) ?? [], now));
  }
  return out;
}

function studentKpiRows(studentId: string, batchId: string | null, m: StudentMetrics): KpiInput[] {
  const base = { scope: "STUDENT" as const, studentId, batchId };
  return [
    { ...base, metricName: "submission_completion_rate", value: m.submissionCompletionRate },
    { ...base, metricName: "avg_test_score_pct", value: m.avgTestScorePct },
    { ...base, metricName: "review_turnaround_hours", value: m.reviewTurnaroundHours },
    { ...base, metricName: "days_since_last_activity", value: m.daysSinceLastActivity },
    { ...base, metricName: "at_risk", value: m.atRisk ? 1 : 0 },
  ];
}

/**
 * Writes many KPI values in a constant number of round trips:
 *   - KPILatest is replaced for every key (the "current value" table).
 *   - KPI (history) only gets a row when the value actually changed, so
 *     recomputing a whole batch after one review no longer appends hundreds
 *     of identical rows.
 */
async function recordKpis(inputs: KpiInput[]) {
  if (inputs.length === 0) return;
  const now = new Date();
  const rows = inputs.map((i) => ({
    key: kpiKey(i),
    scope: i.scope,
    batchId: i.batchId ?? null,
    studentId: i.studentId ?? null,
    metricName: i.metricName,
    value: Number.isFinite(i.value) ? i.value : 0,
    computedAt: now,
  }));
  const keys = rows.map((r) => r.key);

  const previous = await prisma.kPILatest.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
  const previousByKey = new Map(previous.map((p) => [p.key, p.value]));

  const history = rows.filter((r) => {
    if (LATEST_ONLY_METRICS.has(r.metricName)) return false;
    const prev = previousByKey.get(r.key);
    return prev === undefined || Math.abs(prev - r.value) > 1e-9;
  });

  await prisma.$transaction([
    prisma.kPILatest.deleteMany({ where: { key: { in: keys } } }),
    prisma.kPILatest.createMany({ data: rows }),
    ...(history.length > 0
      ? [prisma.kPI.createMany({ data: history })]
      : []),
  ]);
}

/**
 * Current value of every KPI series matching `where` — one row per series.
 * Reads the KPILatest table, so cost no longer grows with KPI history.
 */
export async function getLatestKpis(where: Prisma.KPILatestWhereInput) {
  return prisma.kPILatest.findMany({ where });
}

export async function recomputeStudentKpis(studentId: string) {
  const [membership, metricsById] = await Promise.all([
    prisma.userBatch.findFirst({ where: { userId: studentId }, select: { batchId: true } }),
    computeStudentsMetrics([studentId]),
  ]);
  const metrics = metricsById.get(studentId)!;
  await recordKpis(studentKpiRows(studentId, membership?.batchId ?? null, metrics));
  return metrics;
}

export async function recomputeBatchKpis(batchId: string) {
  const memberships = await prisma.userBatch.findMany({
    where: { batchId, user: { role: "STUDENT" } },
    select: { userId: true },
  });
  const studentIds = memberships.map((m) => m.userId);
  const metricsById = await computeStudentsMetrics(studentIds);

  // Student rows keep the student's *first* batch as their batchId, matching
  // the previous behaviour of recomputeStudentKpis.
  const firstBatch = new Map<string, string>();
  if (studentIds.length > 0) {
    const all = await prisma.userBatch.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, batchId: true },
    });
    for (const row of all) if (!firstBatch.has(row.userId)) firstBatch.set(row.userId, row.batchId);
  }

  const perStudent = studentIds.map((id) => metricsById.get(id)!);
  const studentRows = studentIds.flatMap((id) =>
    studentKpiRows(id, firstBatch.get(id) ?? batchId, metricsById.get(id)!),
  );

  const batchBase = { scope: "BATCH" as const, batchId };
  const batchRows: KpiInput[] = [
    { ...batchBase, metricName: "student_count", value: perStudent.length },
    { ...batchBase, metricName: "at_risk_count", value: perStudent.filter((m) => m.atRisk).length },
    { ...batchBase, metricName: "submission_completion_rate", value: average(perStudent.map((m) => m.submissionCompletionRate)) },
    { ...batchBase, metricName: "avg_test_score_pct", value: average(perStudent.map((m) => m.avgTestScorePct)) },
    {
      ...batchBase,
      metricName: "review_turnaround_hours",
      value: average(perStudent.map((m) => m.reviewTurnaroundHours).filter((v) => v > 0)),
    },
    { ...batchBase, metricName: "total_submissions", value: perStudent.reduce((a, m) => a + m.totalSubmissions, 0) },
    { ...batchBase, metricName: "approved_submissions", value: perStudent.reduce((a, m) => a + m.approvedSubmissions, 0) },
  ];

  await recordKpis([...studentRows, ...batchRows]);
}

export async function recomputeCohortKpis() {
  const [batchCount, batchKpis] = await Promise.all([
    prisma.batch.count(),
    getLatestKpis({
      scope: "BATCH",
      metricName: {
        in: ["student_count", "at_risk_count", "submission_completion_rate", "avg_test_score_pct", "review_turnaround_hours"],
      },
    }),
  ]);

  const byMetric = (name: string) => batchKpis.filter((k) => k.metricName === name).map((k) => k.value);
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

  await recordKpis([
    { scope: "COHORT", metricName: "batch_count", value: batchCount },
    { scope: "COHORT", metricName: "student_count", value: sum(byMetric("student_count")) },
    { scope: "COHORT", metricName: "at_risk_count", value: sum(byMetric("at_risk_count")) },
    { scope: "COHORT", metricName: "submission_completion_rate", value: average(byMetric("submission_completion_rate")) },
    { scope: "COHORT", metricName: "avg_test_score_pct", value: average(byMetric("avg_test_score_pct")) },
    {
      scope: "COHORT",
      metricName: "review_turnaround_hours",
      value: average(byMetric("review_turnaround_hours").filter((v) => v > 0)),
    },
  ]);
}

/** Full recompute chain: call after any review/scoring action affecting a student. */
export async function recomputeKpisForStudentChange(studentId: string) {
  const membership = await prisma.userBatch.findFirst({ where: { userId: studentId }, select: { batchId: true } });
  if (membership) {
    await recomputeBatchKpis(membership.batchId);
  } else {
    await recomputeStudentKpis(studentId);
  }
  await recomputeCohortKpis();
}
