import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";
import { PageHeader } from "@/components/PageHeader";
import { StudentsBoard, type StudentRow } from "@/components/faculty/StudentsBoard";
import { GraduationCap } from "lucide-react";

export default async function FacultyStudentsPage() {
  const session = await getSession();

  const myBatches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const batchIds = myBatches.map((b) => b.id);

  const [memberships, submissions] = await Promise.all([
    prisma.userBatch.findMany({
      where: { batchId: { in: batchIds }, user: { role: "STUDENT" } },
      select: {
        batch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.submission.findMany({
      where: { batchId: { in: batchIds } },
      select: { studentId: true },
    }),
  ]);

  const submissionCount = new Map<string, number>();
  for (const s of submissions) {
    submissionCount.set(s.studentId, (submissionCount.get(s.studentId) ?? 0) + 1);
  }

  const studentIds = [...new Set(memberships.map((m) => m.user.id))];
  const kpis = await getLatestKpis({
    scope: "STUDENT",
    studentId: { in: studentIds },
    metricName: { in: ["avg_test_score_pct", "at_risk"] },
  });
  const kpiByStudent = new Map<string, Record<string, number>>();
  for (const row of kpis) {
    if (!row.studentId) continue;
    if (!kpiByStudent.has(row.studentId)) kpiByStudent.set(row.studentId, {});
    kpiByStudent.get(row.studentId)![row.metricName] = row.value;
  }

  // A student can sit in more than one of the faculty's batches; the roster
  // lists them once, under the first batch they appear in.
  const seen = new Set<string>();
  const students: StudentRow[] = [];
  for (const m of memberships) {
    if (seen.has(m.user.id)) continue;
    seen.add(m.user.id);
    const k = kpiByStudent.get(m.user.id);
    students.push({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      batchId: m.batch.id,
      batchName: m.batch.name,
      submissions: submissionCount.get(m.user.id) ?? 0,
      avgScorePct: k?.["avg_test_score_pct"] ?? null,
      atRisk: (k?.["at_risk"] ?? 0) === 1,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader icon={GraduationCap} title="Students" description="View and manage students in your courses." />
      <StudentsBoard students={students} batches={myBatches} />
    </div>
  );
}
