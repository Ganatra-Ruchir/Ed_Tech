import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminNotifications } from "@/lib/portal-notifications";
import { PortalShell } from "@/components/university/PortalShell";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { ADMIN_LINKS } from "@/components/admin/nav-links";

// Every portal page is per-user and behind login: never prerender at build time.
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
  if (!session || session.role !== "ADMIN") redirect("/login");

  const currentUser = await prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } });

  return (
    <PortalShell
      userId={session.sub}
      userName={session.name}
      userRole="Administrator"
      userImageUrl={currentUser?.profileImageUrl}
      searchEndpoint="/api/admin/search"
      searchPlaceholder="Search students, faculty, or batches…"
      sidebar={<PortalSidebar title="Admin Portal" links={ADMIN_LINKS} />}
      mobileNav={<PortalMobileNav title="Admin Portal" links={ADMIN_LINKS} />}
      loadNotifications={() => getAdminNotifications(session)}
      modal={modal}
    >
      {children}
    </PortalShell>
  );
}
