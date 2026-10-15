import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFacultyNotifications, getFacultyPendingReviewCount } from "@/lib/portal-notifications";
import { PortalShell } from "@/components/university/PortalShell";
import { FacultySidebar, FacultyMobileNav } from "@/components/faculty/FacultyNav";

// Every portal page is per-user and behind login: never prerender at build time.
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
  if (!session || session.role !== "FACULTY") redirect("/login");

  // Two cheap indexed lookups run in parallel; everything for the bell streams in later.
  const [currentUser, pendingReviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, select: { profileImageUrl: true } }),
    getFacultyPendingReviewCount(session),
  ]);

  return (
    <PortalShell
      userId={session.sub}
      userName={session.name}
      userRole={session.isCC ? "Faculty · Course Coordinator" : "Faculty"}
      userImageUrl={currentUser?.profileImageUrl}
      searchEndpoint="/api/faculty/search"
      searchPlaceholder="Search students, submissions, or tests…"
      sidebar={<FacultySidebar isCC={session.isCC} pendingReviews={pendingReviews} />}
      mobileNav={<FacultyMobileNav isCC={session.isCC} pendingReviews={pendingReviews} />}
      loadNotifications={() => getFacultyNotifications(session)}
      modal={modal}
    >
      {children}
    </PortalShell>
  );
}
