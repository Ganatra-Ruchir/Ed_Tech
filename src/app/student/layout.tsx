import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { STUDENT_LINKS } from "@/components/student/nav-links";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  // Lightweight, indexed lookups only — enough to light up the notification
  // bell without duplicating the full dashboard query on every page.
  const [needsRevisionCount, dueSoonCount] = await Promise.all([
    prisma.submission.count({ where: { studentId: session.sub, status: "NEEDS_REVISION" } }),
    prisma.test.count({
      where: {
        publishedAt: { not: null },
        batch: { members: { some: { userId: session.sub } } },
        dueAt: { gte: new Date(), lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        responses: { none: { studentId: session.sub } },
      },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <PortalSidebar title="Student Portal" layoutId="student" links={STUDENT_LINKS} />
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <PortalMobileNav title="Student Portal" links={STUDENT_LINKS} />
        <PortalTopbar
          userName={session.name}
          userRole="Student"
          hasAlerts={needsRevisionCount + dueSoonCount > 0}
          searchEndpoint="/api/student/search"
          searchPlaceholder="Search for tests, submissions, or announcements…"
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
