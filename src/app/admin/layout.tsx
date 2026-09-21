import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { PortalPageTransition } from "@/components/university/PortalPageTransition";
import { ADMIN_LINKS } from "@/components/admin/nav-links";
import { getMessageNotifications } from "@/lib/message-notifications";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  /** Parallel route slot backing the student/batch drill-down drawers
   * (`src/app/admin/@modal/`). It must stay rendered or those intercepted
   * routes silently stop opening. */
  modal: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  // One indexed count — enough to light the notification bell without
  // repeating the dashboard's queries on every admin page.
  const [pendingReviewCount, currentUser, recentSubmissions, messageNotifications, pendingLeaveCount, recentPendingLeaves] = await Promise.all([
    prisma.submission.count({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } }),
    prisma.submission.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
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

  const notifications = [
    ...messageNotifications,
    ...recentSubmissions.map((submission) => ({ id: `admin-submission:${submission.id}`, title: `${submission.student.name} submitted ${submission.assignment?.title ?? submission.title}`, detail: "Open the student's academic record", href: `/admin/students/${submission.studentId}` })),
    ...recentPendingLeaves.map((request) => ({ id: `leave-request:${request.id}`, title: `${request.faculty.name} requested leave`, detail: `${request.startDate}${request.endDate !== request.startDate ? ` to ${request.endDate}` : ""}`, href: "/admin/leave" })),
    ...(pendingReviewCount > recentSubmissions.length ? [{ id: "admin:more-submissions", title: `${pendingReviewCount - recentSubmissions.length} more submissions`, detail: "Open the admin dashboard", href: "/admin" }] : []),
    ...(pendingLeaveCount > recentPendingLeaves.length ? [{ id: "admin:more-leave-requests", title: `${pendingLeaveCount - recentPendingLeaves.length} more leave requests`, detail: "Open the leave review queue", href: "/admin/leave" }] : []),
  ];

  return (
    <div className="portal-shell flex min-h-screen bg-[#f6f4f1]">
      <PortalSidebar title="Admin Portal" layoutId="admin" links={ADMIN_LINKS} />
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <PortalMobileNav title="Admin Portal" links={ADMIN_LINKS} />
        <PortalTopbar
          userId={session.sub}
          userName={session.name}
          userRole="Administrator"
          userImageUrl={currentUser?.profileImageUrl}
          hasAlerts={pendingReviewCount + pendingLeaveCount + messageNotifications.length > 0}
          notifications={notifications}
          searchEndpoint="/api/admin/search"
          searchPlaceholder="Search students, faculty, or batches…"
        />
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-7 lg:py-7"><PortalPageTransition>{children}</PortalPageTransition></main>
      </div>
      {modal}
    </div>
  );
}
