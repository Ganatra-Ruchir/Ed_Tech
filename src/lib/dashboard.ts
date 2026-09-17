import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";

const TREND_METRICS = ["submission_completion_rate", "avg_test_score_pct"] as const;

export type TrendPoint = { computedAt: string; metricName: string; value: number };

export async function getCohortOverview() {
  const [latest, history, batches] = await Promise.all([
    getLatestKpis({ scope: "COHORT" }),
    prisma.kPI.findMany({
      where: { scope: "COHORT", metricName: { in: [...TREND_METRICS] } },
      orderBy: { computedAt: "asc" },
    }),
    prisma.batch.findMany({ orderBy: { name: "asc" } }),
  ]);

  const kpiByName = Object.fromEntries(latest.map((k) => [k.metricName, k.value]));

  const batchLatest = await getLatestKpis({ scope: "BATCH" });
  const batchKpiById = new Map<string, Record<string, number>>();
  for (const row of batchLatest) {
    if (!row.batchId) continue;
    if (!batchKpiById.has(row.batchId)) batchKpiById.set(row.batchId, {});
    batchKpiById.get(row.batchId)![row.metricName] = row.value;
  }

  return {
    kpi: {
      studentCount: kpiByName["student_count"] ?? 0,
      atRiskCount: kpiByName["at_risk_count"] ?? 0,
      submissionCompletionRate: kpiByName["submission_completion_rate"] ?? 0,
      avgTestScorePct: kpiByName["avg_test_score_pct"] ?? 0,
      reviewTurnaroundHours: kpiByName["review_turnaround_hours"] ?? 0,
      batchCount: kpiByName["batch_count"] ?? batches.length,
    },
    history: history.map((h) => ({
      computedAt: h.computedAt.toISOString(),
      metricName: h.metricName,
      value: h.value,
    })) satisfies TrendPoint[],
    batches: batches.map((b) => {
      const k = batchKpiById.get(b.id) ?? {};
      return {
        id: b.id,
        name: b.name,
        studentCount: k["student_count"] ?? 0,
        atRiskCount: k["at_risk_count"] ?? 0,
        submissionCompletionRate: k["submission_completion_rate"] ?? 0,
        avgTestScorePct: k["avg_test_score_pct"] ?? 0,
      };
    }),
  };
}

export async function getBatchOverview(batchId: string) {
  const [batch, latest, history] = await Promise.all([
    prisma.batch.findUniqueOrThrow({ where: { id: batchId } }),
    getLatestKpis({ scope: "BATCH", batchId }),
    prisma.kPI.findMany({
      where: { scope: "BATCH", batchId, metricName: { in: [...TREND_METRICS] } },
      orderBy: { computedAt: "asc" },
    }),
  ]);

  const kpiByName = Object.fromEntries(latest.map((k) => [k.metricName, k.value]));

  const memberships = await prisma.userBatch.findMany({
    where: { batchId, user: { role: "STUDENT" } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  const studentLatest = await getLatestKpis({
    scope: "STUDENT",
    studentId: { in: memberships.map((m) => m.userId) },
  });
  const studentKpiById = new Map<string, Record<string, number>>();
  for (const row of studentLatest) {
    if (!row.studentId) continue;
    if (!studentKpiById.has(row.studentId)) studentKpiById.set(row.studentId, {});
    studentKpiById.get(row.studentId)![row.metricName] = row.value;
  }

  return {
    batch,
    kpi: {
      studentCount: kpiByName["student_count"] ?? memberships.length,
      atRiskCount: kpiByName["at_risk_count"] ?? 0,
      submissionCompletionRate: kpiByName["submission_completion_rate"] ?? 0,
      avgTestScorePct: kpiByName["avg_test_score_pct"] ?? 0,
      reviewTurnaroundHours: kpiByName["review_turnaround_hours"] ?? 0,
    },
    history: history.map((h) => ({
      computedAt: h.computedAt.toISOString(),
      metricName: h.metricName,
      value: h.value,
    })) satisfies TrendPoint[],
    students: memberships.map((m) => {
      const k = studentKpiById.get(m.userId) ?? {};
      return {
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        submissionCompletionRate: k["submission_completion_rate"] ?? 0,
        avgTestScorePct: k["avg_test_score_pct"] ?? 0,
        atRisk: (k["at_risk"] ?? 0) === 1,
      };
    }),
  };
}
