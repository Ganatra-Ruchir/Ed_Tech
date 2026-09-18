import { prisma } from "@/lib/prisma";

/**
 * Early-warning risk engine.
 *
 * Design rules (deliberate, please preserve them):
 *  - Every risk level is derived from *measurable* records, never guessed.
 *  - Every contributing reason carries the arithmetic behind it (`detail`)
 *    plus the raw counts (`evidence`), so any number shown in the UI can be
 *    expanded into "why this number?" without re-querying.
 *  - Assessment is batch-first: one query per table for N students, then all
 *    scoring happens in memory. Never call the single-student helper in a loop.
 */

export type RiskLevel = "NORMAL" | "WATCH" | "AT_RISK" | "CRITICAL";

export type RiskReasonCode =
  | "MISSING_ASSIGNMENTS"
  | "LATE_SUBMISSIONS"
  | "REVISION_LOOP"
  | "LOW_ATTENDANCE"
  | "MARKS_DECLINE"
  | "LOW_COMPLETION";

export type RiskReason = {
  code: RiskReasonCode;
  /** One-line summary, e.g. "3 assignments missing". */
  label: string;
  /** The calculation in words, e.g. "4 of 22 due assignments have no submission". */
  detail: string;
  /** Points this reason contributed to the total risk score. */
  points: number;
  /** Raw numbers so the UI can render a breakdown without recomputing. */
  evidence: Record<string, number>;
};

export type RiskAssessment = {
  studentId: string;
  level: RiskLevel;
  /** 0-100. Sum of reason points, capped. */
  score: number;
  reasons: RiskReason[];
  metrics: {
    assignmentsDue: number;
    submitted: number;
    missing: number;
    late: number;
    needsRevision: number;
    completionRate: number;
    attendancePct: number | null;
    attendanceSessions: number;
    avgScorePct: number | null;
    scoreDeltaPct: number | null;
  };
  computedAt: Date;
};

/** Score thresholds. Tuned so a single mild signal is WATCH, not AT_RISK. */
const THRESHOLDS: { level: RiskLevel; min: number }[] = [
  { level: "CRITICAL", min: 60 },
  { level: "AT_RISK", min: 35 },
  { level: "WATCH", min: 18 },
  { level: "NORMAL", min: 0 },
];

function levelFor(score: number): RiskLevel {
  return THRESHOLDS.find((t) => score >= t.min)!.level;
}

export const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  CRITICAL: 3,
  AT_RISK: 2,
  WATCH: 1,
  NORMAL: 0,
};

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}

/**
 * Assess many students at once. Returns a Map keyed by studentId; students
 * with no data still get a NORMAL assessment so callers can rely on the key
 * existing.
 */
export async function assessStudentsRisk(studentIds: string[]): Promise<Map<string, RiskAssessment>> {
  const out = new Map<string, RiskAssessment>();
  if (studentIds.length === 0) return out;

  const now = new Date();

  const [memberships, submissions, attendance, responses] = await Promise.all([
    prisma.userBatch.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, batchId: true },
    }),
    prisma.submission.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, assignmentId: true, status: true, createdAt: true },
    }),
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true, date: true },
    }),
    prisma.testResponse.findMany({
      where: { studentId: { in: studentIds }, score: { not: null } },
      select: { studentId: true, score: true, maxScore: true, submittedAt: true, createdAt: true },
    }),
  ]);

  const batchIds = [...new Set(memberships.map((m) => m.batchId))];
  // Only assignments whose deadline has passed can be "missing".
  const assignments = batchIds.length
    ? await prisma.assignment.findMany({
        where: { batchId: { in: batchIds }, dueAt: { not: null, lte: now } },
        select: { id: true, batchId: true, dueAt: true },
      })
    : [];

  const batchesByStudent = new Map<string, string[]>();
  for (const m of memberships) {
    const list = batchesByStudent.get(m.userId) ?? [];
    list.push(m.batchId);
    batchesByStudent.set(m.userId, list);
  }
  const assignmentsByBatch = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = assignmentsByBatch.get(a.batchId) ?? [];
    list.push(a);
    assignmentsByBatch.set(a.batchId, list);
  }
  const dueAtById = new Map(assignments.map((a) => [a.id, a.dueAt]));

  function group<T extends { studentId: string }>(rows: T[]): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const list = m.get(r.studentId) ?? [];
      list.push(r);
      m.set(r.studentId, list);
    }
    return m;
  }
  const subsBy = group(submissions);
  const attBy = group(attendance);
  const respBy = group(responses);

  for (const studentId of studentIds) {
    const myBatches = batchesByStudent.get(studentId) ?? [];
    const due = myBatches.flatMap((b) => assignmentsByBatch.get(b) ?? []);
    const subs = subsBy.get(studentId) ?? [];
    const att = attBy.get(studentId) ?? [];
    const resp = respBy.get(studentId) ?? [];

    const submittedAssignmentIds = new Set(subs.map((s) => s.assignmentId).filter(Boolean) as string[]);
    const assignmentsDue = due.length;
    const submitted = due.filter((a) => submittedAssignmentIds.has(a.id)).length;
    const missing = assignmentsDue - submitted;

    const late = subs.filter((s) => {
      if (!s.assignmentId) return false;
      const d = dueAtById.get(s.assignmentId);
      return Boolean(d && s.createdAt.getTime() > d.getTime());
    }).length;

    const needsRevision = subs.filter((s) => s.status === "NEEDS_REVISION").length;
    const completionRate = pct(submitted, assignmentsDue);

    const attendanceSessions = att.length;
    const present = att.filter((a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "EXCUSED").length;
    const attendancePct = attendanceSessions > 0 ? pct(present, attendanceSessions) : null;

    // Marks trend: split graded responses chronologically in half and compare.
    const graded = resp
      .filter((r) => r.score !== null && (r.maxScore ?? 0) > 0)
      .map((r) => ({
        at: (r.submittedAt ?? r.createdAt).getTime(),
        pct: ((r.score as number) / (r.maxScore as number)) * 100,
      }))
      .sort((a, b) => a.at - b.at);
    const avgScorePct = graded.length ? graded.reduce((s, g) => s + g.pct, 0) / graded.length : null;
    let scoreDeltaPct: number | null = null;
    if (graded.length >= 4) {
      const mid = Math.floor(graded.length / 2);
      const earlier = graded.slice(0, mid);
      const recent = graded.slice(mid);
      const eAvg = earlier.reduce((s, g) => s + g.pct, 0) / earlier.length;
      const rAvg = recent.reduce((s, g) => s + g.pct, 0) / recent.length;
      scoreDeltaPct = rAvg - eAvg;
    }

    const reasons: RiskReason[] = [];

    if (missing > 0) {
      const points = Math.min(missing * 12, 36);
      reasons.push({
        code: "MISSING_ASSIGNMENTS",
        label: `${missing} assignment${missing === 1 ? "" : "s"} missing`,
        detail: `${missing} of ${assignmentsDue} assignments past their due date have no submission.`,
        points,
        evidence: { missing, assignmentsDue, submitted },
      });
    }

    if (late >= 2) {
      const points = Math.min(late * 6, 18);
      reasons.push({
        code: "LATE_SUBMISSIONS",
        label: `${late} late submissions`,
        detail: `${late} submission${late === 1 ? " was" : "s were"} made after the assignment deadline.`,
        points,
        evidence: { late, totalSubmissions: subs.length },
      });
    }

    if (needsRevision >= 2) {
      const points = Math.min(needsRevision * 7, 21);
      reasons.push({
        code: "REVISION_LOOP",
        label: `${needsRevision} submissions awaiting revision`,
        detail: `${needsRevision} submission${needsRevision === 1 ? " is" : "s are"} currently marked NEEDS_REVISION and not yet resolved.`,
        points,
        evidence: { needsRevision, totalSubmissions: subs.length },
      });
    }

    if (attendancePct !== null && attendancePct < 75 && attendanceSessions >= 5) {
      const points = Math.min(Math.round(75 - attendancePct), 25);
      reasons.push({
        code: "LOW_ATTENDANCE",
        label: `Attendance ${attendancePct.toFixed(0)}%`,
        detail: `Present for ${present} of ${attendanceSessions} recorded sessions (${attendancePct.toFixed(1)}%), below the 75% threshold.`,
        points,
        evidence: { present, attendanceSessions, attendancePct: Math.round(attendancePct) },
      });
    }

    if (scoreDeltaPct !== null && scoreDeltaPct <= -10) {
      const drop = Math.abs(scoreDeltaPct);
      const points = Math.min(Math.round(drop), 20);
      reasons.push({
        code: "MARKS_DECLINE",
        label: `Marks down ${drop.toFixed(0)}%`,
        detail: `Average across the most recent ${Math.ceil(graded.length / 2)} graded items fell ${drop.toFixed(1)} points versus the earlier ${Math.floor(graded.length / 2)}.`,
        points,
        evidence: { dropPct: Math.round(drop), gradedItems: graded.length },
      });
    }

    if (assignmentsDue >= 3 && completionRate < 60) {
      const points = Math.min(Math.round((60 - completionRate) / 2), 15);
      reasons.push({
        code: "LOW_COMPLETION",
        label: `Completion ${completionRate.toFixed(0)}%`,
        detail: `Submitted ${submitted} of ${assignmentsDue} due assignments (${completionRate.toFixed(1)}%), below the 60% threshold.`,
        points,
        evidence: { submitted, assignmentsDue, completionRate: Math.round(completionRate) },
      });
    }

    const score = Math.min(
      reasons.reduce((s, r) => s + r.points, 0),
      100,
    );
    reasons.sort((a, b) => b.points - a.points);

    out.set(studentId, {
      studentId,
      level: levelFor(score),
      score,
      reasons,
      metrics: {
        assignmentsDue,
        submitted,
        missing,
        late,
        needsRevision,
        completionRate,
        attendancePct,
        attendanceSessions,
        avgScorePct,
        scoreDeltaPct,
      },
      computedAt: now,
    });
  }

  return out;
}

/** Convenience wrapper for a single student. Do not call inside a loop. */
export async function assessStudentRisk(studentId: string): Promise<RiskAssessment> {
  const map = await assessStudentsRisk([studentId]);
  return map.get(studentId)!;
}
