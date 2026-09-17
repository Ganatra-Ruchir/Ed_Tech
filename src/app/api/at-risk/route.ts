import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { userBatchIds } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";

export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId") ?? undefined;

  const scopedBatchFilter =
    session.role === "FACULTY" && !session.isCC && !batchId
      ? { batchId: { in: await userBatchIds(session.sub) } }
      : batchId
        ? { batchId }
        : {};

  const latest = await getLatestKpis({
    scope: "STUDENT",
    metricName: { in: ["at_risk", "avg_test_score_pct", "days_since_last_activity"] },
    ...scopedBatchFilter,
  });

  const byStudent = new Map<string, Record<string, number>>();
  for (const row of latest) {
    if (!row.studentId) continue;
    if (!byStudent.has(row.studentId)) byStudent.set(row.studentId, {});
    byStudent.get(row.studentId)![row.metricName] = row.value;
  }

  const studentIds = [...byStudent.entries()]
    .filter(([, metrics]) => metrics["at_risk"] === 1)
    .map(([id]) => id);

  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    include: { batchMemberships: { include: { batch: true } } },
  });

  const result = students.map((s) => {
    const metrics = byStudent.get(s.id) ?? {};
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      batch: s.batchMemberships[0]?.batch.name ?? null,
      avgTestScorePct: metrics["avg_test_score_pct"] ?? null,
      daysSinceLastActivity: metrics["days_since_last_activity"] ?? null,
    };
  });

  return NextResponse.json({ students: result });
}
