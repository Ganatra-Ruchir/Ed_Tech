import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  FileArchive,
  FileImage,
  FileVideo,
  ArrowLeft,
  Download,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/Card";
import { Tag } from "@/components/Tag";
import { LinkButton } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";

function fmtDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(fileType: string, fileName: string): LucideIcon {
  const t = `${fileType} ${fileName}`.toLowerCase();
  if (t.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/.test(t)) return FileImage;
  if (t.includes("video") || /\.(mp4|mov|webm|avi)$/.test(t)) return FileVideo;
  if (t.includes("zip") || t.includes("compressed") || /\.(zip|rar|7z|tar|gz)$/.test(t)) return FileArchive;
  return FileText;
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
      batch: { select: { name: true } },
      files: { orderBy: { createdAt: "asc" } },
      feedback: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      evidence: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!submission || submission.studentId !== session!.sub) {
    notFound();
  }

  const timeline = [
    { key: "created", icon: Plus, label: "Submitted", at: submission.createdAt },
    ...(submission.reviewedAt
      ? [{ key: "reviewed", icon: CheckCircle2, label: "Reviewed by faculty", at: submission.reviewedAt }]
      : []),
    ...submission.feedback.map((f) => ({
      key: `fb-${f.id}`,
      icon: MessageSquare,
      label: `Feedback from ${f.faculty.name}`,
      at: f.createdAt,
    })),
    ...submission.evidence.map((e) => ({
      key: `ev-${e.id}`,
      icon: Sparkles,
      label: `Evidence tagged "${e.tag}" by ${e.faculty.name}`,
      at: e.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="max-w-3xl space-y-5">
      <Link
        href="/student/submissions"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-[#ef5b3f]"
      >
        <ArrowLeft size={13} /> Back to submissions
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[17px] font-semibold text-zinc-900">{submission.title}</h1>
              <StatusBadge status={submission.status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-zinc-500">
              <span className="rounded-full bg-[#ef5b3f]/[0.08] px-2 py-0.5 text-[10.5px] font-medium text-[#ef5b3f]">
                {submission.batch.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> Submitted {fmtDateTime(submission.createdAt)}
              </span>
              {submission.reviewedAt && <span>· Reviewed {fmtDateTime(submission.reviewedAt)}</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Files</p>
            <p className="text-lg font-bold text-zinc-900">{submission.files.length}</p>
          </div>
        </div>

        {submission.notes && (
          <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50/70 p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Your notes</p>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">{submission.notes}</p>
          </div>
        )}
      </Card>

      {submission.status === "NEEDS_REVISION" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3">
          <p className="flex items-start gap-2 text-[13px] text-rose-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            Your faculty asked for a revision. Read the feedback below, then upload an updated version.
          </p>
          <LinkButton href="/student/submissions/new" size="sm" className="!bg-[#ef5b3f] hover:!bg-[#d9472e]">
            <Plus size={13} /> Upload revision
          </LinkButton>
        </div>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
          <FileText size={14} className="text-[#ef5b3f]" /> Files
        </h2>
        <Card>
          {submission.files.length === 0 ? (
            <EmptyState icon={FileText} title="No files attached" />
          ) : (
            <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {submission.files.map((f) => {
                const Icon = iconFor(f.fileType, f.fileName);
                return (
                  <li key={f.id}>
                    <a
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 rounded-md border border-zinc-200 px-3 py-2.5 transition-colors hover:border-[#ef5b3f]/30 hover:bg-[#ef5b3f]/[0.03]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/[0.08] text-[#ef5b3f]">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-zinc-900">{f.fileName}</span>
                        <span className="block truncate text-[11px] text-zinc-400">
                          {fmtSize(f.fileSize) || f.fileType}
                        </span>
                      </span>
                      <Download size={14} className="shrink-0 text-zinc-300 transition-colors group-hover:text-[#ef5b3f]" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
          <MessageSquare size={14} className="text-[#ef5b3f]" /> Feedback
          {submission.feedback.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              {submission.feedback.length}
            </span>
          )}
        </h2>
        {submission.feedback.length === 0 ? (
          <Card>
            <EmptyState
              icon={MessageSquare}
              title="No feedback yet"
              description="Your faculty's comments will appear here once your work has been reviewed."
            />
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {submission.feedback.map((f) => (
              <li key={f.id}>
                <Card className="p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={f.faculty.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-zinc-900">{f.faculty.name}</p>
                      <p className="text-[11px] text-zinc-400">{fmtDateTime(f.createdAt)}</p>
                      {f.rating !== null && <StarRating value={f.rating} readOnly size={14} />}
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">{f.comment}</p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {submission.evidence.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
            <Sparkles size={14} className="text-[#ef5b3f]" /> Evidence Tags
          </h2>
          <Card className="p-4">
            <ul className="space-y-2.5">
              {submission.evidence.map((e) => (
                <li key={e.id} className="flex flex-wrap items-start gap-2">
                  <Tag label={e.tag} />
                  <span className="min-w-0 flex-1 text-[12.5px] text-zinc-600">
                    {e.notes || <span className="text-zinc-400">No note added.</span>}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {e.faculty.name} · {fmtDateTime(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
          <Clock size={14} className="text-[#ef5b3f]" /> Activity
        </h2>
        <Card className="p-4">
          <ol className="space-y-3">
            {timeline.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.key} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                    <Icon size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-zinc-700">{t.label}</p>
                    <p className="text-[11px] text-zinc-400">{fmtDateTime(t.at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>
    </div>
  );
}
