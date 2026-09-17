import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";

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
          <h1 className="text-lg font-semibold text-slate-900">{submission.title}</h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Submitted {fmtDateTime(submission.createdAt)}
          {submission.reviewedAt ? ` · Reviewed ${fmtDateTime(submission.reviewedAt)}` : ""}
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

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Feedback</h2>
        {submission.feedback.length === 0 ? (
          <p className="text-sm text-slate-500">No feedback yet.</p>
        ) : (
          <ul className="space-y-3">
            {submission.feedback.map((f) => (
              <li key={f.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="text-slate-700">{f.comment}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {f.faculty.name} · {fmtDateTime(f.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {submission.evidence.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Evidence tags</h2>
          <ul className="flex flex-wrap gap-2">
            {submission.evidence.map((e) => (
              <li
                key={e.id}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                title={e.notes ?? undefined}
              >
                {e.tag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
