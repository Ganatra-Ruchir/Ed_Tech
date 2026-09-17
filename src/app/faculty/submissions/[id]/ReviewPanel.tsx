"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Select, Input, Textarea } from "@/components/Field";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Tag";

type Evidence = { id: string; tag: string; notes: string | null; faculty: string; createdAt: string };
type FeedbackItem = { id: string; comment: string; faculty: string; createdAt: string };

const EVIDENCE_TAGS = ["meets-criteria", "needs-revision", "risk", "strong-effort", "incomplete"];

export function ReviewPanel({
  submissionId,
  currentStatus,
  existingEvidence,
  existingFeedback,
}: {
  submissionId: string;
  currentStatus: string;
  existingEvidence: Evidence[];
  existingFeedback: FeedbackItem[];
}) {
  const router = useRouter();
  const [tag, setTag] = useState(EVIDENCE_TAGS[0]);
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshAfter(action: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence() {
    await refreshAfter(() =>
      fetch(`/api/submissions/${submissionId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, notes: evidenceNotes || undefined }),
      }),
    );
    setEvidenceNotes("");
  }

  async function addFeedback() {
    if (!comment.trim()) return;
    await refreshAfter(() =>
      fetch(`/api/submissions/${submissionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      }),
    );
    setComment("");
  }

  async function setStatus(status: "IN_REVIEW" | "APPROVED" | "NEEDS_REVISION") {
    await refreshAfter(() =>
      fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900">Decision</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus("IN_REVIEW")}
            disabled={busy || currentStatus === "IN_REVIEW"}
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 disabled:opacity-50"
          >
            Mark in review
          </button>
          <button
            onClick={() => setStatus("APPROVED")}
            disabled={busy || currentStatus === "APPROVED"}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setStatus("NEEDS_REVISION")}
            disabled={busy || currentStatus === "NEEDS_REVISION"}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 disabled:opacity-50"
          >
            Request revision
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900">Tag evidence</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tag} onChange={(e) => setTag(e.target.value)} className="w-auto">
            {EVIDENCE_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Input
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            placeholder="Optional note"
            className="min-w-[180px] flex-1"
          />
          <Button onClick={addEvidence} disabled={busy} size="sm">
            Add tag
          </Button>
        </div>
        {existingEvidence.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {existingEvidence.map((e) => (
              <li key={e.id}>
                <Tag label={`${e.tag} · ${e.faculty}`} title={e.notes ?? undefined} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900">Feedback</h2>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Write structured feedback for the student"
        />
        <Button onClick={addFeedback} disabled={busy} size="sm" className="mt-2">
          Post feedback
        </Button>

        {existingFeedback.length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {existingFeedback.map((f) => (
              <li key={f.id} className="rounded-md border border-zinc-100 bg-zinc-50 p-3 text-sm">
                <p className="text-zinc-700">{f.comment}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {f.faculty} · {new Date(f.createdAt).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
