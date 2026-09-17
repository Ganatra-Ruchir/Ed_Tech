"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Decision</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus("IN_REVIEW")}
            disabled={busy || currentStatus === "IN_REVIEW"}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 disabled:opacity-50"
          >
            Mark in review
          </button>
          <button
            onClick={() => setStatus("APPROVED")}
            disabled={busy || currentStatus === "APPROVED"}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setStatus("NEEDS_REVISION")}
            disabled={busy || currentStatus === "NEEDS_REVISION"}
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 disabled:opacity-50"
          >
            Request revision
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Tag evidence</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {EVIDENCE_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            placeholder="Optional note"
            className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={addEvidence}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Add tag
          </button>
        </div>
        {existingEvidence.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {existingEvidence.map((e) => (
              <li
                key={e.id}
                title={e.notes ?? undefined}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
              >
                {e.tag} · {e.faculty}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Feedback</h2>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Write structured feedback for the student"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={addFeedback}
          disabled={busy}
          className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Post feedback
        </button>

        {existingFeedback.length > 0 && (
          <ul className="mt-4 space-y-3">
            {existingFeedback.map((f) => (
              <li key={f.id} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="text-slate-700">{f.comment}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {f.faculty} · {new Date(f.createdAt).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
