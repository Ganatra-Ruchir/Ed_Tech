import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { getMessageNotifications } from "@/lib/message-notifications";

export type PortalNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function shortDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function leaveRange(startDate: string, endDate: string) {
  return `${startDate}${endDate !== startDate ? ` to ${endDate}` : ""}`;
}

/**
 * Notification bell contents for each portal. These are rendered inside a
 * <Suspense> boundary in the layouts, so the page shell paints immediately and
 * the bell fills in when these queries finish — they never block navigation.
 */
export async function getStudentNotifications(session: SessionPayload): Promise<PortalNotification[]> {
  const userId = session.sub;
  const now = new Date();
  const dueSoonEnd = new Date(now.getTime() + 3 * DAY_MS);
  const inMyBatches = { batch: { members: { some: { userId } } } };
  const dueSoonWhere = {
    publishedAt: { not: null },
    ...inMyBatches,
    dueAt: { gte: now, lte: dueSoonEnd },
    responses: { none: { studentId: userId } },
  };

  const [needsRevisionCount, dueSoonCount, revisionSubmissions, dueSoonTests, recentAnnouncements, messages, recentMaterials] =
    await Promise.all([
      prisma.submission.count({ where: { studentId: userId, status: "NEEDS_REVISION" } }),
      prisma.test.count({ where: dueSoonWhere }),
      prisma.submission.findMany({
        where: { studentId: userId, status: "NEEDS_REVISION" },
        select: { id: true, title: true, assignment: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.test.findMany({
        where: dueSoonWhere,
        select: { id: true, title: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 5,
      }),
      prisma.announcement.findMany({
        where: inMyBatches,
        select: { id: true, title: true, faculty: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      getMessageNotifications(userId),
      prisma.learningMaterial.findMany({
        where: inMyBatches,
        select: { id: true, title: true, subject: true, faculty: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return [
    ...messages,
    ...recentAnnouncements.map((a) => ({
      id: `announcement:${a.id}`,
      title: a.title,
      detail: `Announcement from ${a.faculty.name}`,
      href: `/student/stream#announcement-${a.id}`,
    })),
    ...recentMaterials.map((m) => ({
      id: `material:${m.id}`,
      title: `New ${m.subject} material: ${m.title}`,
      detail: `Shared by ${m.faculty.name}`,
      href: "/student/materials",
    })),
    ...revisionSubmissions.map((s) => ({
      id: `revision:${s.id}`,
      title: `${s.assignment?.title ?? s.title} needs revision`,
      detail: "Open the submission and review faculty feedback",
      href: `/student/submissions/${s.id}`,
    })),
    ...dueSoonTests.map((t) => ({
      id: `test-due:${t.id}`,
      title: `${t.title} is due soon`,
      detail: t.dueAt ? `Due ${shortDate(t.dueAt)}` : "Open the test",
      href: `/student/tests/${t.id}`,
    })),
    ...(needsRevisionCount > revisionSubmissions.length
      ? [{
          id: "student:more-revisions",
          title: `${needsRevisionCount - revisionSubmissions.length} more revision requests`,
          detail: "Open all submissions",
          href: "/student/submissions",
        }]
      : []),
    ...(dueSoonCount > dueSoonTests.length
      ? [{
          id: "student:more-tests",
          title: `${dueSoonCount - dueSoonTests.length} more tests due soon`,
          detail: "Open all assigned tests",
          href: "/student/tests",
        }]
      : []),
  ];
}

/**
 * Batch scope for a faculty member. Course coordinators see every batch, so
 * they get no filter at all (previously this loaded every batch id first and
 * passed the whole list back in an `IN (...)`).
 */
export function facultyBatchScope(session: SessionPayload) {
  return session.isCC ? {} : { batch: { members: { some: { userId: session.sub } } } };
}

/** Badge count for the faculty sidebar. One indexed count. */
export function getFacultyPendingReviewCount(session: SessionPayload) {
  return prisma.submission.count({
    where: { ...facultyBatchScope(session), status: { in: ["SUBMITTED", "IN_REVIEW"] } },
  });
}

export async function getFacultyNotifications(session: SessionPayload): Promise<PortalNotification[]> {
  const scope = facultyBatchScope(session);
  const pendingWhere = { ...scope, status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] } };
  const ungradedWhere = {
    test: scope,
    answers: { some: { question: { type: "SHORT_ANSWER" as const }, isCorrect: null } },
  };

  const [pendingReviews, ungradedResponses, recentSubmissions, recentUngraded, messages, recentLeaveDecisions] =
    await Promise.all([
      prisma.submission.count({ where: pendingWhere }),
      prisma.testResponse.count({ where: ungradedWhere }),
      prisma.submission.findMany({
        where: pendingWhere,
        select: {
          id: true,
          title: true,
          status: true,
          student: { select: { name: true } },
          assignment: { select: { title: true } },
          batch: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.testResponse.findMany({
        where: ungradedWhere,
        select: { id: true, student: { select: { name: true } }, test: { select: { title: true } } },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
      getMessageNotifications(session.sub),
      prisma.leaveRequest.findMany({
        where: { facultyId: session.sub, status: { in: ["APPROVED", "REJECTED"] } },
        select: { id: true, status: true, startDate: true, endDate: true, adminNote: true },
        orderBy: { reviewedAt: "desc" },
        take: 5,
      }),
    ]);

  return [
    ...messages,
    ...recentSubmissions.map((s) => ({
      id: `submission:${s.id}`,
      title: `${s.student.name} submitted ${s.assignment?.title ?? s.title}`,
      detail: `${s.batch.name} · ${s.status === "IN_REVIEW" ? "Review in progress" : "Ready for review"}`,
      href: `/faculty/submissions/${s.id}`,
    })),
    ...recentUngraded.map((r) => ({
      id: `test-response:${r.id}`,
      title: `${r.student.name} completed ${r.test.title}`,
      detail: "Short answers are waiting for grading",
      href: `/faculty/test-responses/${r.id}`,
    })),
    ...recentLeaveDecisions.map((r) => ({
      id: `leave-decision:${r.id}:${r.status}`,
      title: `Leave request ${r.status === "APPROVED" ? "approved" : "not approved"}`,
      detail: `${leaveRange(r.startDate, r.endDate)}${r.adminNote ? ` · ${r.adminNote}` : ""}`,
      href: "/faculty/leave",
    })),
    ...(pendingReviews > recentSubmissions.length
      ? [{
          id: "faculty:more-submissions",
          title: `${pendingReviews - recentSubmissions.length} more submissions`,
          detail: "Open the review queue",
          href: "/faculty/review",
        }]
      : []),
    ...(ungradedResponses > recentUngraded.length
      ? [{
          id: "faculty:more-responses",
          title: `${ungradedResponses - recentUngraded.length} more responses`,
          detail: "Open all tests",
          href: "/faculty/tests",
        }]
      : []),
  ];
}

export async function getAdminNotifications(session: SessionPayload): Promise<PortalNotification[]> {
  const pendingWhere = { status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] } };
  const [pendingReviewCount, recentSubmissions, messages, pendingLeaveCount, recentPendingLeaves] = await Promise.all([
    prisma.submission.count({ where: pendingWhere }),
    prisma.submission.findMany({
      where: pendingWhere,
      select: { id: true, title: true, studentId: true, student: { select: { name: true } }, assignment: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getMessageNotifications(session.sub),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      select: { id: true, startDate: true, endDate: true, faculty: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return [
    ...messages,
    ...recentSubmissions.map((s) => ({
      id: `admin-submission:${s.id}`,
      title: `${s.student.name} submitted ${s.assignment?.title ?? s.title}`,
      detail: "Open the student's academic record",
      href: `/admin/students/${s.studentId}`,
    })),
    ...recentPendingLeaves.map((r) => ({
      id: `leave-request:${r.id}`,
      title: `${r.faculty.name} requested leave`,
      detail: leaveRange(r.startDate, r.endDate),
      href: "/admin/leave",
    })),
    ...(pendingReviewCount > recentSubmissions.length
      ? [{
          id: "admin:more-submissions",
          title: `${pendingReviewCount - recentSubmissions.length} more submissions`,
          detail: "Open the admin dashboard",
          href: "/admin",
        }]
      : []),
    ...(pendingLeaveCount > recentPendingLeaves.length
      ? [{
          id: "admin:more-leave-requests",
          title: `${pendingLeaveCount - recentPendingLeaves.length} more leave requests`,
          detail: "Open the leave review queue",
          href: "/admin/leave",
        }]
      : []),
  ];
}
