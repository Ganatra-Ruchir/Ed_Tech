import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { FacultySidebar, FacultyMobileNav } from "@/components/faculty/FacultyNav";
import { PortalPageTransition } from "@/components/university/PortalPageTransition";
import { getMessageNotifications } from "@/lib/message-notifications";

export const dynamic = "force-dynamic";

export default async function FacultyLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  /** `@modal` parallel-route slot — renders the intercepted student-record drawer. */
  modal: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "FACULTY") {
    redirect("/login");
  }

  const batchIds = session.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session.sub);

  // Two small indexed counts — enough to badge the queue and light the bell
  // without repeating a page's full query on every navigation.
  const [pendingReviews, ungradedResponses, currentUser, recentSubmissions, recentUngradedResponses, messageNotifications, recentLeaveDecisions] = await Promise.all([
    prisma.submission.count({
      where: { batchId: { in: batchIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
    prisma.testResponse.count({
      where: {
        test: { batchId: { in: batchIds } },
        answers: { some: { question: { type: "SHORT_ANSWER" }, isCorrect: null } },
      },
    }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } }),
    prisma.submission.findMany({
      where: { batchId: { in: batchIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      select: { id: true, title: true, status: true, student: { select: { name: true } }, assignment: { select: { title: true } }, batch: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.testResponse.findMany({
      where: { test: { batchId: { in: batchIds } }, answers: { some: { question: { type: "SHORT_ANSWER" }, isCorrect: null } } },
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

  const notifications = [
    ...messageNotifications,
    ...recentSubmissions.map((submission) => ({
      id: `submission:${submission.id}`,
      title: `${submission.student.name} submitted ${submission.assignment?.title ?? submission.title}`,
      detail: `${submission.batch.name} · ${submission.status === "IN_REVIEW" ? "Review in progress" : "Ready for review"}`,
      href: `/faculty/submissions/${submission.id}`,
    })),
    ...recentUngradedResponses.map((response) => ({
      id: `test-response:${response.id}`,
      title: `${response.student.name} completed ${response.test.title}`,
      detail: "Short answers are waiting for grading",
      href: `/faculty/test-responses/${response.id}`,
    })),
    ...recentLeaveDecisions.map((request) => ({
      id: `leave-decision:${request.id}:${request.status}`,
      title: `Leave request ${request.status === "APPROVED" ? "approved" : "not approved"}`,
      detail: `${request.startDate}${request.endDate !== request.startDate ? ` to ${request.endDate}` : ""}${request.adminNote ? ` · ${request.adminNote}` : ""}`,
      href: "/faculty/leave",
    })),
    ...(pendingReviews > recentSubmissions.length ? [{ id: "faculty:more-submissions", title: `${pendingReviews - recentSubmissions.length} more submissions`, detail: "Open the review queue", href: "/faculty/review" }] : []),
    ...(ungradedResponses > recentUngradedResponses.length ? [{ id: "faculty:more-responses", title: `${ungradedResponses - recentUngradedResponses.length} more responses`, detail: "Open all tests", href: "/faculty/tests" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-[#f4f5f0]">
      <FacultySidebar isCC={session.isCC} pendingReviews={pendingReviews} />
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <FacultyMobileNav isCC={session.isCC} pendingReviews={pendingReviews} />
        <PortalTopbar
          userId={session.sub}
          userName={session.name}
          userRole={session.isCC ? "Faculty · Course Coordinator" : "Faculty"}
          userImageUrl={currentUser?.profileImageUrl}
          hasAlerts={pendingReviews + ungradedResponses + messageNotifications.length + recentLeaveDecisions.length > 0}
          notifications={notifications}
          searchEndpoint="/api/faculty/search"
          searchPlaceholder="Search students, submissions, or tests…"
        />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"><PortalPageTransition>{children}</PortalPageTransition></main>
      </div>
      {modal}
    </div>
  );
}
