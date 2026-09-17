import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSubmission } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { ReviewPanel } from "./ReviewPanel";

function fmtDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function FacultySubmissionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      batch: { select: { id: true, name: true } },
      files: true,
      evidence: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      feedback: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!submission) notFound();

  const allowed = await canAccessSubmission(session!, submission);
  if (!allowed) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "Submission", entityId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">{submission.title}</h1>
            <StatusBadge status={submission.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {submission.student.name} · {submission.batch.name} · Submitted {fmtDateTime(submission.createdAt)}
          </p>
        </div>

        {submission.notes && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            {submission.notes}
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Files</h2>
          <ul className="space-y-1">
            {submission.files.map((f) => (
              <li key={f.id}>
                <a href={f.fileUrl} target="_blank" className="text-sm text-indigo-600 hover:underline">
                  {f.fileName}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <ReviewPanel
          submissionId={submission.id}
          currentStatus={submission.status}
          existingEvidence={submission.evidence.map((e) => ({
            id: e.id,
            tag: e.tag,
            notes: e.notes,
            faculty: e.faculty.name,
            createdAt: e.createdAt.toISOString(),
          }))}
          existingFeedback={submission.feedback.map((f) => ({
            id: f.id,
            comment: f.comment,
            faculty: f.faculty.name,
            createdAt: f.createdAt.toISOString(),
          }))}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Audit trail</h2>
        <ul className="space-y-2">
          {auditLogs.length === 0 && <p className="text-sm text-slate-500">No actions logged yet.</p>}
          {auditLogs.map((log) => (
            <li key={log.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
              <p className="font-medium text-slate-800">{log.action}</p>
              <p className="text-slate-500">
                {log.actor.name} · {fmtDateTime(log.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
