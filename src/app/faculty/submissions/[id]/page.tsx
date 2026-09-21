import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSubmission } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { fmtDateTime } from "@/components/faculty/faculty-format";
import { ReviewPanel } from "./ReviewPanel";

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
      batch: { select: { id: true, name: true, department: true, semester: true } },
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
    <div className="space-y-4">
      <Link
        href="/faculty/review"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft size={13} /> Back to queue
      </Link>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={submission.student.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-zinc-900">{submission.student.name}</p>
              <p className="truncate text-[12px] text-zinc-500">
                {submission.batch.department} · {submission.batch.name} · {submission.student.email}
              </p>
            </div>
          </div>
          <Link
            href={`/faculty/students/${submission.student.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#ef5b3f]/20 bg-[#ef5b3f]/[0.06] px-3 py-2 text-[12.5px] font-medium text-[#ef5b3f] transition-colors hover:bg-[#ef5b3f] hover:text-white"
          >
            View Student Profile <ExternalLink size={12} />
          </Link>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/[0.07] text-[#ef5b3f]">
              <FileText size={16} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-zinc-900">{submission.title}</h1>
              <p className="truncate text-[12px] text-zinc-500">
                Submitted on {fmtDateTime(submission.createdAt)}
                {submission.reviewedAt ? ` · Reviewed ${fmtDateTime(submission.reviewedAt)}` : ""}
              </p>
            </div>
          </div>
          <StatusBadge status={submission.status} />
        </div>
      </Card>

      <ReviewPanel
        submissionId={submission.id}
        currentStatus={submission.status}
        notes={submission.notes}
        files={submission.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          fileType: f.fileType,
          fileSize: f.fileSize,
        }))}
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
        activity={auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          actor: log.actor.name,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
