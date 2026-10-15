import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentNotifications } from "@/lib/portal-notifications";
import { PortalShell } from "@/components/university/PortalShell";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { STUDENT_LINKS } from "@/components/student/nav-links";

// Every portal page is per-user and behind login: never prerender at build time.
export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const currentUser = await prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } });

  return (
    <PortalShell
      userId={session.sub}
      userName={session.name}
      userRole="Student"
      userImageUrl={currentUser?.profileImageUrl}
      searchEndpoint="/api/student/search"
      searchPlaceholder="Search for tests, submissions, or announcements…"
      sidebar={<PortalSidebar title="Silver Oak University" links={STUDENT_LINKS} />}
      mobileNav={<PortalMobileNav title="Student Portal" links={STUDENT_LINKS} />}
      loadNotifications={() => getStudentNotifications(session)}
    >
      {children}
    </PortalShell>
  );
}
