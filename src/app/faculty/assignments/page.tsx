import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { AssignmentForm } from "@/components/faculty/AssignmentForm";
import { Card } from "@/components/Card";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default async function FacultyAssignmentsPage() {
  const session = await getSession();
  const batchIds = session!.isCC ? (await prisma.batch.findMany({ select: { id: true } })).map((batch) => batch.id) : await userBatchIds(session!.sub);
  const [batches, assignments] = await Promise.all([
    prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.assignment.findMany({ where: { batchId: { in: batchIds } }, include: { batch: { select: { name: true } }, _count: { select: { submissions: true } } }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Assignments" description="Create batch tasks, attach instructions, and track student submissions." actions={<AssignmentForm batches={batches} />} />
      {assignments.length === 0 ? <Card><EmptyState icon={FileText} title="No assignments yet" description="Create your first assignment with the button above." /></Card> : <div className="space-y-2">{assignments.map((assignment) => <Card key={assignment.id} className="flex items-start gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#6b1029]/[0.08] text-[#6b1029]"><FileText size={16} /></span><div className="min-w-0 flex-1"><p className="font-semibold text-zinc-900">{assignment.title}</p><p className="text-xs text-zinc-500">{assignment.batch.name} · {assignment._count.submissions} submission(s){assignment.dueAt ? ` · Due ${new Date(assignment.dueAt).toLocaleDateString("en-IN")}` : ""}</p>{assignment.description && <p className="mt-1 text-sm text-zinc-600">{assignment.description}</p>}</div>{assignment.attachmentUrl && <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#6b1029] hover:underline">View attachment</a>}</Card>)}</div>}
    </div>
  );
}