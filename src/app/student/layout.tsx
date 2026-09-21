import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { STUDENT_LINKS } from "@/components/student/nav-links";
import { PortalPageTransition } from "@/components/university/PortalPageTransition";
import { getMessageNotifications } from "@/lib/message-notifications";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  // Lightweight, indexed lookups only — enough to light up the notification
  // bell without duplicating the full dashboard query on every page.
  const now = new Date();
  const dueSoonEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const [needsRevisionCount, dueSoonCount, currentUser, revisionSubmissions, dueSoonTests, recentAnnouncements, messageNotifications, recentMaterials] = await Promise.all([
    prisma.submission.count({ where: { studentId: session.sub, status: "NEEDS_REVISION" } }),
    prisma.test.count({
      where: {
        publishedAt: { not: null },
        batch: { members: { some: { userId: session.sub } } },
        dueAt: { gte: now, lte: dueSoonEnd },
        responses: { none: { studentId: session.sub } },
      },
    }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } }),
    prisma.submission.findMany({
      where: { studentId: session.sub, status: "NEEDS_REVISION" },
      select: { id: true, title: true, assignment: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.test.findMany({
      where: {
        publishedAt: { not: null },
        batch: { members: { some: { userId: session.sub } } },
        dueAt: { gte: now, lte: dueSoonEnd },
        responses: { none: { studentId: session.sub } },
      },
      select: { id: true, title: true, dueAt: true },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: { batch: { members: { some: { userId: session.sub } } } },
      select: { id: true, title: true, faculty: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getMessageNotifications(session.sub),
    prisma.learningMaterial.findMany({
      where: { batch: { members: { some: { userId: session.sub } } } },
      select: { id: true, title: true, subject: true, faculty: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const notifications = [
    ...messageNotifications,
    ...recentAnnouncements.map((announcement) => ({ id: `announcement:${announcement.id}`, title: announcement.title, detail: `Announcement from ${announcement.faculty.name}`, href: `/student/stream#announcement-${announcement.id}` })),
    ...recentMaterials.map((material) => ({ id: `material:${material.id}`, title: `New ${material.subject} material: ${material.title}`, detail: `Shared by ${material.faculty.name}`, href: "/student/materials" })),
    ...revisionSubmissions.map((submission) => ({ id: `revision:${submission.id}`, title: `${submission.assignment?.title ?? submission.title} needs revision`, detail: "Open the submission and review faculty feedback", href: `/student/submissions/${submission.id}` })),
    ...dueSoonTests.map((test) => ({ id: `test-due:${test.id}`, title: `${test.title} is due soon`, detail: test.dueAt ? `Due ${test.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Open the test", href: `/student/tests/${test.id}` })),
    ...(needsRevisionCount > revisionSubmissions.length ? [{ id: "student:more-revisions", title: `${needsRevisionCount - revisionSubmissions.length} more revision requests`, detail: "Open all submissions", href: "/student/submissions" }] : []),
    ...(dueSoonCount > dueSoonTests.length ? [{ id: "student:more-tests", title: `${dueSoonCount - dueSoonTests.length} more tests due soon`, detail: "Open all assigned tests", href: "/student/tests" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-[#f4f5f0]">
      <PortalSidebar title="Student Portal" layoutId="student" links={STUDENT_LINKS} />
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <PortalMobileNav title="Student Portal" links={STUDENT_LINKS} />
        <PortalTopbar
          userId={session.sub}
          userName={session.name}
          userRole="Student"
          userImageUrl={currentUser?.profileImageUrl}
          hasAlerts={needsRevisionCount + dueSoonCount + recentAnnouncements.length + recentMaterials.length + messageNotifications.length > 0}
          notifications={notifications}
          searchEndpoint="/api/student/search"
          searchPlaceholder="Search for tests, submissions, or announcements…"
        />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"><PortalPageTransition>{children}</PortalPageTransition></main>
      </div>
    </div>
  );
}
