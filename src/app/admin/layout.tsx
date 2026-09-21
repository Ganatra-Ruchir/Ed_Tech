import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { PortalPageTransition } from "@/components/university/PortalPageTransition";
import { ADMIN_LINKS } from "@/components/admin/nav-links";
import { getMessageNotifications } from "@/lib/message-notifications";

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
  const [pendingReviewCount, currentUser, recentSubmissions, messageNotifications] = await Promise.all([
    prisma.submission.count({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } }),
    prisma.submission.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      select: { title: true, studentId: true, student: { select: { name: true } }, assignment: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getMessageNotifications(session.sub),
  ]);

  const notifications = [
    ...messageNotifications,
    ...recentSubmissions.map((submission) => ({ title: `${submission.student.name} submitted ${submission.assignment?.title ?? submission.title}`, detail: "Open the student's academic record", href: `/admin/students/${submission.studentId}` })),
    ...(pendingReviewCount > recentSubmissions.length ? [{ title: `${pendingReviewCount - recentSubmissions.length} more submissions`, detail: "Open the admin dashboard", href: "/admin" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-[#f4f5f0]">
      <PortalSidebar title="Admin Portal" layoutId="admin" links={ADMIN_LINKS} />
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <PortalMobileNav title="Admin Portal" links={ADMIN_LINKS} />
        <PortalTopbar
          userName={session.name}
          userRole="Administrator"
          userImageUrl={currentUser?.profileImageUrl}
          hasAlerts={pendingReviewCount + messageNotifications.length > 0}
          notifications={notifications}
          searchEndpoint="/api/admin/search"
          searchPlaceholder="Search students, faculty, or batches…"
        />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"><PortalPageTransition>{children}</PortalPageTransition></main>
      </div>
      {modal}
    </div>
  );
}
