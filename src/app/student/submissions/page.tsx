import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SubmissionsBoard } from "@/components/student/SubmissionsBoard";
import { AssignmentsBoard } from "@/components/student/AssignmentsBoard";
import { userBatchIds } from "@/lib/permissions";

export default async function StudentSubmissionsPage() {
  const session = await getSession();

  const batchIds = await userBatchIds(session!.sub);
  const [submissions, assignments] = await Promise.all([
    prisma.submission.findMany({ where: { studentId: session!.sub }, include: { _count: { select: { feedback: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.assignment.findMany({ where: { batchId: { in: batchIds } }, include: { batch: { select: { name: true } }, submissions: { where: { studentId: session!.sub }, select: { id: true } } }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="My Submissions" description="Upload and track your project work." />
      <section className="space-y-2"><h2 className="text-sm font-semibold text-zinc-900">Assigned work</h2><AssignmentsBoard assignments={assignments.map((assignment) => ({ id: assignment.id, title: assignment.title, description: assignment.description, dueAt: assignment.dueAt, batchName: assignment.batch.name, attachmentUrl: assignment.attachmentUrl, submitted: assignment.submissions.length > 0 }))} /></section>
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
