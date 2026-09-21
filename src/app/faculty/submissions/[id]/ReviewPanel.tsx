"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FileVideo,
  FileImage,
  FileArchive,
  Plus,
  Tag as TagIcon,
  MessageSquare,
  History,
  Paperclip,
} from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtFileSize, statusLabel } from "@/components/faculty/faculty-format";

type FileItem = { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number };
type EvidenceItem = { id: string; tag: string; notes: string | null; faculty: string; createdAt: string };
type FeedbackItem = { id: string; comment: string; faculty: string; createdAt: string };
type ActivityItem = { id: string; action: string; actor: string; createdAt: string };

const EVIDENCE_TAGS = ["meets-criteria", "needs-revision", "risk", "strong-effort", "incomplete"];
const STATUS_OPTIONS = ["IN_REVIEW", "APPROVED", "NEEDS_REVISION"] as const;

function iconFor(fileType: string) {
  const t = fileType.toLowerCase();
  if (t.includes("video")) return FileVideo;
  if (t.includes("image")) return FileImage;
  if (t.includes("zip") || t.includes("compress") || t.includes("archive")) return FileArchive;
  return FileText;
}

const fieldClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10";

export function ReviewPanel({
  submissionId,
  currentStatus,
  notes,
  files,
  existingEvidence,
  existingFeedback,
  activity,
}: {
  submissionId: string;
  currentStatus: string;
  notes: string | null;
  files: FileItem[];
  existingEvidence: EvidenceItem[];
  existingFeedback: FeedbackItem[];
  activity: ActivityItem[];
}) {
  const router = useRouter();
  const tabs = [
    { key: "submission", label: "Submission" },
    { key: "evidence", label: `Evidence (${existingEvidence.length})` },
    { key: "feedback", label: `Feedback (${existingFeedback.length})` },
    { key: "activity", label: "Activity Log" },
  ] as const;

  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("submission");
  const [tag, setTag] = useState(EVIDENCE_TAGS[0]);
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<string>(
    (STATUS_OPTIONS as readonly string[]).includes(currentStatus) ? currentStatus : "IN_REVIEW",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function addEvidence() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, notes: evidenceNotes || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not add evidence");
        return;
      }
      setEvidenceNotes("");
      setNotice("Evidence added.");
      setTab("evidence");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Posts the feedback comment and/or applies the chosen status in one go. */
  async function saveReview() {
    const trimmed = comment.trim();
    if (!trimmed && status === currentStatus) {
      setError("Write feedback or pick a different status first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (trimmed) {
        const res = await fetch(`/api/submissions/${submissionId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: trimmed }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Could not post feedback");
          return;
        }
      }
      if (status !== currentStatus) {
        const res = await fetch(`/api/submissions/${submissionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Could not update status");
          return;
        }
      }
      setComment("");
      setNotice("Review saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                tab === t.key
                  ? "border-[#ef5b3f] text-[#ef5b3f]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "submission" && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-zinc-100 px-4 py-2.5">
                <p className="text-[13px] font-semibold text-zinc-900">Files ({files.length})</p>
              </div>
              {files.length === 0 ? (
                <EmptyState icon={Paperclip} title="No files attached" />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {files.map((f) => {
                    const Icon = iconFor(f.fileType);
                    return (
                      <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/[0.07] text-[#ef5b3f]">
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-zinc-900">
                            {f.fileName}
                          </span>
                          <span className="block text-[11px] text-zinc-400">{fmtFileSize(f.fileSize)}</span>
                        </span>
                        <a
                          href={f.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Download ${f.fileName}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          <Download size={15} />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="p-4">
              <p className="mb-1.5 text-[13px] font-semibold text-zinc-900">Student Notes</p>
              {notes ? (
                <p className="whitespace-pre-wrap text-[13px] text-zinc-600">{notes}</p>
              ) : (
                <p className="text-[13px] text-zinc-400">The student did not leave any notes.</p>
              )}
            </Card>
          </div>
        )}

        {tab === "evidence" && (
          <Card className="overflow-hidden">
            {existingEvidence.length === 0 ? (
              <EmptyState icon={TagIcon} title="No evidence tagged yet" description="Add one from the panel on the right." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {existingEvidence.map((e) => (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#ef5b3f]/[0.08] px-2 py-0.5 text-[11px] font-medium text-[#ef5b3f]">
                        {e.tag}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {e.faculty} · {fmtDateTime(e.createdAt)}
                      </span>
                    </div>
                    {e.notes && <p className="mt-1.5 text-[13px] text-zinc-600">{e.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "feedback" && (
          <Card className="overflow-hidden">
            {existingFeedback.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No feedback yet" description="Write the first note on the right." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {existingFeedback.map((f) => (
                  <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar name={f.faculty} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-zinc-400">
                        {f.faculty} · {fmtDateTime(f.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] text-zinc-700">{f.comment}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "activity" && (
          <Card className="overflow-hidden">
            {activity.length === 0 ? (
              <EmptyState icon={History} title="No actions logged yet" />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
                      <History size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-800">{a.action}</span>
                      <span className="block text-[11px] text-zinc-400">
                        {a.actor} · {fmtDateTime(a.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Card className="p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-zinc-900">Add Evidence</p>
          <label htmlFor="evidence-tag" className="mb-1 block text-xs font-medium text-zinc-600">
            Tag
          </label>
          <select
            id="evidence-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className={fieldClass}
          >
            {EVIDENCE_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label htmlFor="evidence-notes" className="mb-1 mt-3 block text-xs font-medium text-zinc-600">
            Notes
          </label>
          <textarea
            id="evidence-notes"
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            rows={3}
            placeholder="What does this evidence show?"
            className={fieldClass}
          />

          <button
            onClick={addEvidence}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#ef5b3f] px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#d9472e] disabled:opacity-50"
          >
            <Plus size={14} /> Add Evidence
          </button>
        </Card>

        <Card className="p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-zinc-900">Provide Feedback</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            placeholder="Write structured feedback for the student…"
            className={fieldClass}
          />

          <label htmlFor="review-status" className="mb-1 mt-3 block text-xs font-medium text-zinc-600">
            Status
          </label>
          <div className="flex items-center gap-2">
            <select
              id="review-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <button
              onClick={saveReview}
              disabled={busy}
              className="shrink-0 rounded-md bg-[#ef5b3f] px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#d9472e] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          {notice && !error && <p className="mt-2 text-xs text-emerald-600">{notice}</p>}
        </Card>
      </div>
    </div>
  );
}
