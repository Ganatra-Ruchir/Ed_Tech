import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { calculateStudentPerformance } from "@/lib/student-performance";

export async function getStudentReportData(studentId: string) {
  const student = await prisma.user.findUniqueOrThrow({
    where: { id: studentId },
    include: { batchMemberships: { include: { batch: true } } },
  });

  const batch = student.batchMemberships[0]?.batch ?? null;

  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: {
      assignment: { select: { dueAt: true } },
      evidence: { include: { faculty: { select: { name: true } } } },
      feedback: { include: { faculty: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const testResponses = await prisma.testResponse.findMany({
    where: { studentId },
    include: {
      test: { select: { title: true } },
      answers: { include: { question: true } },
      evidence: { include: { faculty: { select: { name: true } } } },
      feedback: { include: { faculty: { select: { name: true } } } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const kpis = await getLatestKpis({ scope: "STUDENT", studentId });
  const attendance = await prisma.attendance.findMany({
    where: { studentId },
    select: { status: true },
  });
  const kpiByName = Object.fromEntries(kpis.map((k) => [k.metricName, k.value]));

  const performance = calculateStudentPerformance({
    submissions: submissions.map((submission) => ({
      submittedAt: submission.createdAt,
      dueAt: submission.assignment?.dueAt ?? null,
    })),
    ratings: [
      ...submissions.flatMap((submission) => submission.feedback.map((item) => item.rating)),
      ...testResponses.flatMap((response) => response.feedback.map((item) => item.rating)),
    ],
    attendance,
  });

  const shortAnswerReflections = testResponses.flatMap((r) =>
    r.answers
      .filter((a) => a.question.type === "SHORT_ANSWER" && a.answerText)
      .map((a) => ({ question: a.question.text, answer: a.answerText as string, test: r.test.title })),
  );

  const evidenceLog = [
    ...submissions.flatMap((s) =>
      s.evidence.map((e) => ({
        date: e.createdAt,
        tag: e.tag,
        notes: e.notes,
        faculty: e.faculty.name,
        source: `Submission: ${s.title}`,
      })),
    ),
    ...testResponses.flatMap((r) =>
      r.evidence.map((e) => ({
        date: e.createdAt,
        tag: e.tag,
        notes: e.notes,
        faculty: e.faculty.name,
        source: `Test: ${r.test.title}`,
      })),
    ),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const feedbackLog = [
    ...submissions.flatMap((s) =>
      s.feedback.map((f) => ({
        date: f.createdAt,
        comment: f.comment,
        rating: f.rating,
        faculty: f.faculty.name,
        source: `Submission: ${s.title}`,
      })),
    ),
    ...testResponses.flatMap((r) =>
      r.feedback.map((f) => ({
        date: f.createdAt,
        comment: f.comment,
        rating: f.rating,
        faculty: f.faculty.name,
        source: `Test: ${r.test.title}`,
      })),
    ),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    student,
    batch,
    submissions,
    testResponses,
    kpi: {
      submissionCompletionRate: kpiByName["submission_completion_rate"] ?? 0,
      avgTestScorePct: kpiByName["avg_test_score_pct"] ?? 0,
      reviewTurnaroundHours: kpiByName["review_turnaround_hours"] ?? 0,
      daysSinceLastActivity: kpiByName["days_since_last_activity"] ?? -1,
      atRisk: (kpiByName["at_risk"] ?? 0) === 1,
    },
    performance,
    shortAnswerReflections,
    evidenceLog,
    feedbackLog,
  };
}

export type StudentReportData = Awaited<ReturnType<typeof getStudentReportData>>;

export async function getBatchReportData(batchId: string) {
  const batch = await prisma.batch.findUniqueOrThrow({ where: { id: batchId } });

  const memberships = await prisma.userBatch.findMany({
    where: { batchId, user: { role: "STUDENT" } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const studentIds = memberships.map((m) => m.userId);

  const studentKpis = await getLatestKpis({ scope: "STUDENT", studentId: { in: studentIds } });
  const kpisByStudent = new Map<string, Record<string, number>>();
  for (const k of studentKpis) {
    if (!k.studentId) continue;
    if (!kpisByStudent.has(k.studentId)) kpisByStudent.set(k.studentId, {});
    kpisByStudent.get(k.studentId)![k.metricName] = k.value;
  }

  const students = memberships.map((m) => {
    const kpi = kpisByStudent.get(m.userId) ?? {};
    return {
      id: m.userId,
      name: m.user.name,
      email: m.user.email,
      submissionCompletionRate: kpi["submission_completion_rate"] ?? 0,
      avgTestScorePct: kpi["avg_test_score_pct"] ?? 0,
      atRisk: (kpi["at_risk"] ?? 0) === 1,
    };
  });

  const batchKpis = await getLatestKpis({ scope: "BATCH", batchId });
  const kpiByName = Object.fromEntries(batchKpis.map((k) => [k.metricName, k.value]));

  const submissionsByStatus = await prisma.submission.groupBy({
    by: ["status"],
    where: { batchId },
    _count: { _all: true },
  });

  return {
    batch,
    students,
    kpi: {
      studentCount: kpiByName["student_count"] ?? students.length,
      atRiskCount: kpiByName["at_risk_count"] ?? 0,
      submissionCompletionRate: kpiByName["submission_completion_rate"] ?? 0,
      avgTestScorePct: kpiByName["avg_test_score_pct"] ?? 0,
      reviewTurnaroundHours: kpiByName["review_turnaround_hours"] ?? 0,
      totalSubmissions: kpiByName["total_submissions"] ?? 0,
    },
    submissionsByStatus,
  };
}

export type BatchReportData = Awaited<ReturnType<typeof getBatchReportData>>;
