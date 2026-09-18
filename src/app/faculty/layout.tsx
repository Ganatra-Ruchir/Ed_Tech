import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PortalTopbar } from "@/components/university/PortalTopbar";
import { FacultySidebar, FacultyMobileNav } from "@/components/faculty/FacultyNav";

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
  const [pendingReviews, ungradedResponses] = await Promise.all([
    prisma.submission.count({
      where: { batchId: { in: batchIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
    prisma.testResponse.count({
      where: {
        test: { batchId: { in: batchIds } },
        answers: { some: { question: { type: "SHORT_ANSWER" }, isCorrect: null } },
      },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <FacultySidebar isCC={session.isCC} pendingReviews={pendingReviews} />
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <FacultyMobileNav isCC={session.isCC} pendingReviews={pendingReviews} />
        <PortalTopbar
          userName={session.name}
          userRole={session.isCC ? "Faculty · Course Coordinator" : "Faculty"}
          hasAlerts={pendingReviews + ungradedResponses > 0}
          searchEndpoint="/api/faculty/search"
          searchPlaceholder="Search students, submissions, or tests…"
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {modal}
    </div>
  );
}
