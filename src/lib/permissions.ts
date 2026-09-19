import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export async function userBatchIds(userId: string): Promise<string[]> {
  const rows = await prisma.userBatch.findMany({
    where: { userId },
    select: { batchId: true },
  });
  return rows.map((r) => r.batchId);
}

export async function canAccessBatch(
  session: SessionPayload,
  batchId: string,
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  // Course coordinators are intentionally unrestricted across all batches --
  // every call site used to have to remember to OR in session.isCC itself,
  // which several routes forgot (denying legitimate CC access). Centralizing
  // it here means every caller gets it right automatically.
  if (session.role === "FACULTY" && session.isCC) return true;
  if (session.role === "FACULTY" || session.role === "STUDENT") {
    const ids = await userBatchIds(session.sub);
    return ids.includes(batchId);
  }
  return false;
}

export async function canAccessSubmission(
  session: SessionPayload,
  submission: { studentId: string; batchId: string },
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (session.role === "STUDENT") return submission.studentId === session.sub;
  if (session.role === "FACULTY") return canAccessBatch(session, submission.batchId);
  return false;
}

export async function canAccessStudent(
  session: SessionPayload,
  studentId: string,
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (session.role === "STUDENT") return session.sub === studentId;
  if (session.role === "FACULTY") {
    if (session.isCC) return true;
    const [facultyBatches, studentBatches] = await Promise.all([
      userBatchIds(session.sub),
      userBatchIds(studentId),
    ]);
    return studentBatches.some((b) => facultyBatches.includes(b));
  }
  return false;
}
