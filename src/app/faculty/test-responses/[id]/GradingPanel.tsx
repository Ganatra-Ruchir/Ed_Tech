"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  text: string;
  type: "MCQ" | "SHORT_ANSWER";
  answerId: string;
  answerText: string;
  isCorrect: boolean | null;
};
type Evidence = { id: string; tag: string; notes: string | null; faculty: string };
type FeedbackItem = { id: string; comment: string; faculty: string; createdAt: string };

const EVIDENCE_TAGS = ["meets-criteria", "needs-revision", "risk", "strong-effort", "incomplete"];

export function GradingPanel({
  responseId,
  questions,
  evidence,
  feedback,
}: {
  responseId: string;
  questions: Question[];
  evidence: Evidence[];
  feedback: FeedbackItem[];
}) {
  const router = useRouter();
  const [grades, setGrades] = useState<Record<string, boolean | null>>(
    Object.fromEntries(questions.map((q) => [q.answerId, q.isCorrect])),
  );
  const [tag, setTag] = useState(EVIDENCE_TAGS[0]);
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveGrades() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/test-responses/${responseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(grades).map(([id, isCorrect]) => ({ id, isCorrect: Boolean(isCorrect) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save grades");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence() {
    setBusy(true);
    try {
      await fetch(`/api/test-responses/${responseId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, notes: evidenceNotes || undefined }),
      });
      setEvidenceNotes("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addFeedback() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/test-responses/${responseId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      setComment("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">
              {idx + 1}. {q.text}
            </p>
            <p className="mt-2 text-sm text-slate-600">Answer: {q.answerText || "-"}</p>
            {q.type === "MCQ" ? (
              <p className="mt-1 text-xs text-slate-400">
                Auto-graded: {q.isCorrect ? "Correct" : "Incorrect"}
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setGrades((g) => ({ ...g, [q.answerId]: true }))}
                  className={`rounded-md border px-3 py-1 text-xs font-medium ${
                    grades[q.answerId] === true
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  Correct
                </button>
                <button
                  onClick={() => setGrades((g) => ({ ...g, [q.answerId]: false }))}
                  className={`rounded-md border px-3 py-1 text-xs font-medium ${
                    grades[q.answerId] === false
                      ? "border-rose-400 bg-rose-50 text-rose-800"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  Incorrect
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={saveGrades}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save grading
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
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
        {evidence.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {evidence.map((e) => (
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
          placeholder="Write feedback for the student"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={addFeedback}
          disabled={busy}
          className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Post feedback
        </button>
        {feedback.length > 0 && (
          <ul className="mt-4 space-y-3">
            {feedback.map((f) => (
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
