import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/Card";
import { Tag } from "@/components/Tag";
import { EmptyState } from "@/components/EmptyState";

function fmtDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function StudentSubmissionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      files: true,
      feedback: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      evidence: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!submission || submission.studentId !== session!.sub) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold text-zinc-900">{submission.title}</h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Submitted {fmtDateTime(submission.createdAt)}
          {submission.reviewedAt ? ` · Reviewed ${fmtDateTime(submission.reviewedAt)}` : ""}
        </p>
      </div>

      {submission.notes && (
        <Card className="p-4 text-sm text-zinc-700">{submission.notes}</Card>
      )}

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Files</h2>
        <ul className="space-y-1">
          {submission.files.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5">
              <FileText size={13} className="text-zinc-400" />
              <a href={f.fileUrl} target="_blank" className="text-sm text-indigo-600 hover:underline">
                {f.fileName}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Feedback</h2>
        {submission.feedback.length === 0 ? (
          <Card>
            <EmptyState title="No feedback yet" />
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {submission.feedback.map((f) => (
              <Card key={f.id} className="p-3 text-sm">
                <p className="text-zinc-700">{f.comment}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {f.faculty.name} · {fmtDateTime(f.createdAt)}
                </p>
              </Card>
            ))}
          </ul>
        )}
      </div>

      {submission.evidence.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Evidence tags</h2>
          <ul className="flex flex-wrap gap-1.5">
            {submission.evidence.map((e) => (
              <li key={e.id}>
                <Tag label={e.tag} title={e.notes ?? undefined} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
