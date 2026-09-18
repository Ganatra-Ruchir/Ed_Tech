import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalSidebar } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { ADMIN_LINKS } from "@/components/admin/nav-links";

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
  const pendingReviewCount = await prisma.submission.count({
    where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
  });

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <PortalSidebar title="Admin Portal" layoutId="admin" links={ADMIN_LINKS} />
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <PortalMobileNav title="Admin Portal" links={ADMIN_LINKS} />
        <PortalTopbar
          userName={session.name}
          userRole="Administrator"
          hasAlerts={pendingReviewCount > 0}
          notifications={pendingReviewCount > 0 ? [{ title: `${pendingReviewCount} submissions need review`, detail: "Open the admin dashboard", href: "/admin" }] : []}
          searchEndpoint="/api/admin/search"
          searchPlaceholder="Search students, faculty, or batches…"
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {modal}
    </div>
  );
}
