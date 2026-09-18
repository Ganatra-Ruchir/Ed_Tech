import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessStudent } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";

/** Shared loader for a student's "record" view. Lives here rather than in a
 * page file because Next.js route files may only export their own route
 * config (default, metadata, revalidate, …) — an arbitrary named export
 * there fails route validation at build time. */
async function loadRecord(id: string) {
  const student = await prisma.user.findUnique({
    where: { id },
    include: { batchMemberships: { include: { batch: true } } },
  });
  if (!student || student.role !== "STUDENT") return null;

  const [submissions, testResponses, kpis] = await Promise.all([
    prisma.submission.findMany({ where: { studentId: id }, orderBy: { createdAt: "desc" } }),
    prisma.testResponse.findMany({
      where: { studentId: id },
      include: { test: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    getLatestKpis({ scope: "STUDENT", studentId: id }),
  ]);

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    batchName: student.batchMemberships[0]?.batch.name ?? "Unassigned",
    kpiByName: Object.fromEntries(kpis.map((k) => [k.metricName, k.value])),
    submissions,
    testResponses,
  };
}

/** Admin view: role check only — admins may read any student. */
export async function loadStudentRecord(id: string) {
  return loadRecord(id);
}

/** Faculty view: additionally requires the student be in the faculty's scope. */
export async function loadFacultyStudentRecord(id: string) {
  const session = await getSession();
  if (!session) return null;
  const allowed = await canAccessStudent(session, id);
  if (!allowed) return null;
  return loadRecord(id);
}
