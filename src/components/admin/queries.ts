import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { timeAgo } from "@/components/admin/format";
import type {
  ActivityItem,
  AuditRow,
  BarPoint,
  BatchRow,
  DonutSlice,
  FacultyRow,
  ReportRow,
  StudentRow,
  TrendPoint,
} from "@/components/admin/types";

/** Server-only data loaders for the admin portal.
 *
 * Every figure surfaced in the admin UI is derived here from live Prisma
 * rows — there are no seeded or placeholder numbers. Loaders live in this
 * module (rather than inside the route files) because Next.js route files
 * may only export `default`/`metadata`/etc., and because keeping the
 * `Date.now()` reads out of component bodies keeps them pure. */

const DAY_MS = 24 * 60 * 60 * 1000;

const BAND_COLORS = {
  excellent: "#0f9d76",
  good: "#5bc99a",
  needsImprovement: "#f0a825",
  below: "#b83a58",
} as const;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Mean test score (%) per student, over responses that were actually scored. */
function scoreByStudent(
  responses: { studentId: string; score: number | null; maxScore: number | null }[],
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const r of responses) {
    if (r.score === null || r.maxScore === null || r.maxScore <= 0) continue;
    const list = buckets.get(r.studentId) ?? [];
    list.push((r.score / r.maxScore) * 100);
    buckets.set(r.studentId, list);
  }
  return new Map([...buckets].map(([id, values]) => [id, average(values)]));
}

function bandSlices(studentAverages: number[]): DonutSlice[] {
  const excellent = studentAverages.filter((v) => v >= 75).length;
  const good = studentAverages.filter((v) => v >= 60 && v < 75).length;
  const needsImprovement = studentAverages.filter((v) => v >= 40 && v < 60).length;
  const below = studentAverages.filter((v) => v < 40).length;
  return [
    { name: "Excellent (75%+)", value: excellent, color: BAND_COLORS.excellent },
    { name: "Good (60-74%)", value: good, color: BAND_COLORS.good },
    { name: "Needs improvement (40-59%)", value: needsImprovement, color: BAND_COLORS.needsImprovement },
    { name: "Below 40%", value: below, color: BAND_COLORS.below },
  ].filter((slice) => slice.value > 0);
}

/** Latest value per metric, keyed by student id (KPI is an append-only log). */
async function latestStudentKpis(metricNames: string[], studentIds?: string[]) {
  const rows = await getLatestKpis({
    scope: "STUDENT",
    metricName: { in: metricNames },
    ...(studentIds ? { studentId: { in: studentIds } } : {}),
  });
  const byStudent = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!row.studentId) continue;
    if (!byStudent.has(row.studentId)) byStudent.set(row.studentId, {});
    byStudent.get(row.studentId)![row.metricName] = row.value;
  }
  return byStudent;
}

async function latestBatchKpis() {
  const rows = await getLatestKpis({ scope: "BATCH" });
  const byBatch = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!row.batchId) continue;
    if (!byBatch.has(row.batchId)) byBatch.set(row.batchId, {});
    byBatch.get(row.batchId)![row.metricName] = row.value;
  }
  return byBatch;
}

export async function listSemesters(): Promise<string[]> {
  const rows = await prisma.batch.findMany({
    select: { semester: true },
    distinct: ["semester"],
    orderBy: { semester: "asc" },
  });
  return rows.map((r) => r.semester);
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

/**
 * Dashboard figures, optionally narrowed to the batches of one semester.
 * Deltas are real counts of rows created in the trailing 30 days — the
 * schema carries no historical snapshot to compute a percentage change
 * against, so a count is shown instead of a fabricated percentage.
 */
export async function getAdminDashboardData(semester?: string) {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);

  const semesters = await listSemesters();
  const activeSemester = semester && semesters.includes(semester) ? semester : null;

  const scopedBatches = await prisma.batch.findMany({
    where: activeSemester ? { semester: activeSemester } : {},
    select: { id: true },
  });
  const batchIds = scopedBatches.map((b) => b.id);
  const batchScope = activeSemester ? { batchId: { in: batchIds } } : {};

  // When a semester is selected, "students"/"faculty" mean the people
  // enrolled in that semester's batches rather than every user on record.
  let scopedStudentIds: string[] | null = null;
  let scopedFacultyIds: string[] | null = null;
  if (activeSemester) {
    const [studentMemberships, facultyMemberships] = await Promise.all([
      prisma.userBatch.findMany({
        where: { batchId: { in: batchIds }, user: { role: "STUDENT" } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.userBatch.findMany({
        where: { batchId: { in: batchIds }, user: { role: "FACULTY" } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);
    scopedStudentIds = studentMemberships.map((m) => m.userId);
    scopedFacultyIds = facultyMemberships.map((m) => m.userId);
  }

  const studentWhere = scopedStudentIds
    ? { role: "STUDENT" as const, id: { in: scopedStudentIds } }
    : { role: "STUDENT" as const };
  const facultyWhere = scopedFacultyIds
    ? { role: "FACULTY" as const, id: { in: scopedFacultyIds } }
    : { role: "FACULTY" as const };

  const [
    studentCount,
    newStudents,
    facultyCount,
    newFaculty,
    batchCount,
    newBatches,
    submissionCount,
    newSubmissions,
    pendingReviewCount,
  ] = await Promise.all([
    prisma.user.count({ where: studentWhere }),
    prisma.user.count({ where: { ...studentWhere, createdAt: { gte: since30 } } }),
    prisma.user.count({ where: facultyWhere }),
    prisma.user.count({ where: { ...facultyWhere, createdAt: { gte: since30 } } }),
    activeSemester ? Promise.resolve(batchIds.length) : prisma.batch.count(),
    prisma.batch.count({
      where: { createdAt: { gte: since30 }, ...(activeSemester ? { semester: activeSemester } : {}) },
    }),
    prisma.submission.count({ where: batchScope }),
    prisma.submission.count({ where: { ...batchScope, createdAt: { gte: since30 } } }),
    prisma.submission.count({ where: { ...batchScope, status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
  ]);

  // ---- Submission trend: six trailing months of created vs reviewed ----
  const windowStart = new Date(now);
  windowStart.setDate(1);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setMonth(windowStart.getMonth() - 5);

  const [createdRows, reviewedRows] = await Promise.all([
    prisma.submission.findMany({
      where: { ...batchScope, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.submission.findMany({
      where: { ...batchScope, reviewedAt: { gte: windowStart } },
      select: { reviewedAt: true },
    }),
  ]);

  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const buckets = new Map<string, TrendPoint>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(windowStart);
    d.setMonth(windowStart.getMonth() + i);
    buckets.set(monthKey(d), {
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      submitted: 0,
      reviewed: 0,
    });
  }
  for (const row of createdRows) {
    const bucket = buckets.get(monthKey(row.createdAt));
    if (bucket) bucket.submitted += 1;
  }
  for (const row of reviewedRows) {
    if (!row.reviewedAt) continue;
    const bucket = buckets.get(monthKey(row.reviewedAt));
    if (bucket) bucket.reviewed += 1;
  }
  const trend: TrendPoint[] = [...buckets.values()];

  // ---- Overall performance donut, from scored test responses ----
  const responses = await prisma.testResponse.findMany({
    where: {
      score: { not: null },
      ...(activeSemester ? { test: { batchId: { in: batchIds } } } : {}),
    },
    select: { studentId: true, score: true, maxScore: true },
  });
  const perStudent = scoreByStudent(responses);
  const studentAverages = [...perStudent.values()];
  const performance = bandSlices(studentAverages);
  const avgScorePct = average(studentAverages);

  // ---- Recent activity: newest submissions merged with the audit trail ----
  const [recentSubmissions, recentLogs] = await Promise.all([
    prisma.submission.findMany({
      where: batchScope,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        createdAt: true,
        studentId: true,
        student: { select: { name: true } },
        batch: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  const activity: ActivityItem[] = [
    ...recentSubmissions.map((s) => ({
      id: `submission-${s.id}`,
      title: `${s.student.name} submitted "${s.title}"`,
      meta: s.batch.name,
      ago: timeAgo(s.createdAt, now),
      kind: "submission" as const,
      href: `/admin/students/${s.studentId}`,
      sortAt: s.createdAt.getTime(),
    })),
    ...recentLogs.map((l) => ({
      id: `audit-${l.id}`,
      title: `${l.actor.name} · ${l.action.replaceAll(".", " ")}`,
      meta: l.entityType,
      ago: timeAgo(l.createdAt, now),
      kind: "audit" as const,
      href: "/admin/audit",
      sortAt: l.createdAt.getTime(),
    })),
  ]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 6)
    .map((item) => {
      const { sortAt: ignoredSortAt, ...withoutSortAt } = item;
      void ignoredSortAt;
      return withoutSortAt;
    });

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    semesters,
    activeSemester,
    stats: {
      studentCount,
      newStudents,
      facultyCount,
      newFaculty,
      batchCount,
      newBatches,
      submissionCount,
      newSubmissions,
      pendingReviewCount,
    },
    trend,
    performance,
    avgScorePct,
    scoredStudentCount: studentAverages.length,
    activity,
  };
}

export async function getAdminStudentRows(): Promise<StudentRow[]> {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      branch: true,
      college: true,
      studentNumber: true,
      enrollmentNumber: true,
      profileImageUrl: true,
      dateOfBirth: true,
      ccName: true,
      scName: true,
      createdAt: true,
      _count: { select: { submissions: true } },
      batchMemberships: { select: { batch: { select: { name: true, department: true } } } },
    },
  });

  const kpis = await latestStudentKpis(
    ["avg_test_score_pct", "submission_completion_rate", "at_risk"],
    students.map((s) => s.id),
  );
  const scoredResponses = await prisma.testResponse.findMany({
    where: { score: { not: null }, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, score: true, maxScore: true },
  });
  const scored = scoreByStudent(scoredResponses);

  return students.map((s) => {
    const k = kpis.get(s.id) ?? {};
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      branch: s.branch,
      college: s.college,
      studentNumber: s.studentNumber,
      enrollmentNumber: s.enrollmentNumber,
      profileImageUrl: s.profileImageUrl,
      dateOfBirth: s.dateOfBirth?.toISOString() ?? null,
      ccName: s.ccName,
      scName: s.scName,
      batches: s.batchMemberships.map((m) => m.batch.name),
      departments: [...new Set(s.batchMemberships.map((m) => m.batch.department))],
      submissionCount: s._count.submissions,
      completionRate: k["submission_completion_rate"] ?? 0,
      avgScorePct: scored.get(s.id) ?? 0,
      hasTestData: scored.has(s.id),
      atRisk: (k["at_risk"] ?? 0) === 1,
      joinedAt: s.createdAt.toISOString(),
    };
  });
}

export async function getAdminFacultyRows(): Promise<FacultyRow[]> {
  const faculty = await prisma.user.findMany({
    where: { role: "FACULTY" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isCC: true,
      branch: true,
      college: true,
      facultyType: true,
      profileImageUrl: true,
      salary: true,
      dateOfBirth: true,
      joiningDate: true,
      createdAt: true,
      _count: { select: { testsCreated: true, feedbackGiven: true, announcements: true } },
      batchMemberships: { select: { batch: { select: { name: true, department: true } } } },
    },
  });

  return faculty.map((f) => ({
    id: f.id,
    name: f.name,
    email: f.email,
    isCC: f.isCC,
    branch: f.branch,
    college: f.college,
    facultyType: f.facultyType,
    profileImageUrl: f.profileImageUrl,
    salary: f.salary,
    dateOfBirth: f.dateOfBirth?.toISOString() ?? null,
    joiningDate: f.joiningDate?.toISOString() ?? null,
    batches: f.batchMemberships.map((m) => m.batch.name),
    departments: [...new Set(f.batchMemberships.map((m) => m.batch.department))],
    testsCreated: f._count.testsCreated,
    feedbackGiven: f._count.feedbackGiven,
    announcements: f._count.announcements,
    joinedAt: f.createdAt.toISOString(),
  }));
}

export async function getAdminBatchRows(): Promise<BatchRow[]> {
  const [batches, kpiByBatch] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        department: true,
        semester: true,
        createdAt: true,
        _count: { select: { submissions: true, tests: true } },
        members: { select: { user: { select: { role: true } } } },
      },
    }),
    latestBatchKpis(),
  ]);

  return batches.map((b) => {
    const k = kpiByBatch.get(b.id) ?? {};
    return {
      id: b.id,
      name: b.name,
      department: b.department,
      semester: b.semester,
      studentCount: b.members.filter((m) => m.user.role === "STUDENT").length,
      facultyCount: b.members.filter((m) => m.user.role === "FACULTY").length,
      submissionCount: b._count.submissions,
      testCount: b._count.tests,
      atRiskCount: k["at_risk_count"] ?? 0,
      completionRate: k["submission_completion_rate"] ?? 0,
      avgScorePct: k["avg_test_score_pct"] ?? 0,
      createdAt: b.createdAt.toISOString(),
    };
  });
}

export async function getAdminAuditRows(limit = 500): Promise<AuditRow[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadataJson: true,
      createdAt: true,
      actor: { select: { name: true, role: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    actorName: l.actor.name,
    actorRole: l.actor.role,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadataJson,
    createdAt: l.createdAt.toISOString(),
  }));
}

export type AdminAnalyticsData = Awaited<ReturnType<typeof getAdminAnalyticsData>>;

export async function getAdminAnalyticsData() {
  const [statusGroups, responses, batches, kpiByBatch, reviewedSubmissions] = await Promise.all([
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.testResponse.findMany({
      where: { score: { not: null } },
      select: { studentId: true, score: true, maxScore: true },
    }),
    prisma.batch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    latestBatchKpis(),
    prisma.submission.findMany({
      where: { reviewedAt: { not: null } },
      select: { createdAt: true, reviewedAt: true },
    }),
  ]);

  const STATUS_META: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "#6b1029" },
    IN_REVIEW: { label: "In review", color: "#b83a58" },
    APPROVED: { label: "Approved", color: "#0f9d76" },
    NEEDS_REVISION: { label: "Needs revision", color: "#f0a825" },
  };
  const submissionStatus: DonutSlice[] = statusGroups.map((g) => ({
    name: STATUS_META[g.status]?.label ?? g.status,
    value: g._count._all,
    color: STATUS_META[g.status]?.color ?? "#a1a1aa",
  }));
  const totalSubmissions = submissionStatus.reduce((a, s) => a + s.value, 0);

  const perStudent = scoreByStudent(responses);
  const studentAverages = [...perStudent.values()];

  const BUCKETS = [
    { name: "0-20", min: 0, max: 20 },
    { name: "21-40", min: 20, max: 40 },
    { name: "41-60", min: 40, max: 60 },
    { name: "61-80", min: 60, max: 80 },
    { name: "81-100", min: 80, max: 100.01 },
  ];
  const scoreDistribution: BarPoint[] = BUCKETS.map((b) => ({
    name: b.name,
    value: studentAverages.filter((v) => v >= b.min && v < b.max).length,
  }));

  const avgScoreByBatch: BarPoint[] = batches
    .map((b) => ({ name: b.name, value: Math.round(kpiByBatch.get(b.id)?.["avg_test_score_pct"] ?? 0) }))
    .filter((b) => b.value > 0);

  const completionByBatch: BarPoint[] = batches
    .map((b) => ({
      name: b.name,
      value: Math.round(kpiByBatch.get(b.id)?.["submission_completion_rate"] ?? 0),
    }))
    .filter((b) => b.value > 0);

  const turnaroundHours = average(
    reviewedSubmissions.map(
      (s) => ((s.reviewedAt as Date).getTime() - s.createdAt.getTime()) / (1000 * 60 * 60),
    ),
  );

  const approved = statusGroups.find((g) => g.status === "APPROVED")?._count._all ?? 0;

  return {
    submissionStatus,
    totalSubmissions,
    scoreDistribution,
    avgScoreByBatch,
    completionByBatch,
    performance: bandSlices(studentAverages),
    avgScorePct: average(studentAverages),
    scoredStudentCount: studentAverages.length,
    approvalRate: totalSubmissions === 0 ? 0 : (approved / totalSubmissions) * 100,
    reviewedCount: reviewedSubmissions.length,
    turnaroundHours,
  };
}

export async function getAdminReportRows(): Promise<ReportRow[]> {
  const reports = await prisma.report.findMany({
    orderBy: { generatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      scope: true,
      pdfPath: true,
      generatedAt: true,
      studentId: true,
      batch: { select: { name: true } },
    },
  });

  const studentIds = reports.map((r) => r.studentId).filter((id): id is string => Boolean(id));
  const students = studentIds.length
    ? await prisma.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(students.map((s) => [s.id, s.name]));

  return reports.map((r) => ({
    id: r.id,
    scope: r.scope,
    subject: r.batch?.name ?? (r.studentId ? nameById.get(r.studentId) ?? "Unknown student" : "Cohort"),
    pdfPath: r.pdfPath,
    generatedAt: r.generatedAt.toISOString(),
  }));
}

/**
 * Students currently flagged at-risk. The at_risk KPI is filtered *after*
 * taking the latest snapshot per student — KPI is an append-only log, so
 * filtering by value first could surface a stale row.
 */
export async function getAtRiskStudents() {
  const latest = await getLatestKpis({ scope: "STUDENT", metricName: "at_risk" });
  const ids = latest
    .filter((k) => k.value === 1)
    .map((k) => k.studentId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const students = await prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      batchMemberships: { select: { batch: { select: { name: true } } } },
    },
  });

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    batch: s.batchMemberships[0]?.batch.name ?? "-",
  }));
}
