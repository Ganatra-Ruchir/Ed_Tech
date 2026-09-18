import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SubmissionsBoard } from "@/components/student/SubmissionsBoard";

export default async function StudentSubmissionsPage() {
  const session = await getSession();

  const submissions = await prisma.submission.findMany({
    where: { studentId: session!.sub },
    include: { _count: { select: { feedback: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="My Submissions" description="Upload and track your project work." />
      <SubmissionsBoard
        submissions={submissions.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          createdAt: s.createdAt,
          feedbackCount: s._count.feedback,
        }))}
      />
    </div>
  );
}
