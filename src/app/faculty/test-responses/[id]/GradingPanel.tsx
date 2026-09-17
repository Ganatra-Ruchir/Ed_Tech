"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Select, Input, Textarea } from "@/components/Field";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Tag";
import { cn } from "@/lib/cn";

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
    <div className="space-y-5">
      <div className="space-y-2.5">
        {questions.map((q, idx) => (
          <Card key={q.id} className="p-4">
            <p className="text-sm font-medium text-zinc-900">
              {idx + 1}. {q.text}
            </p>
            <p className="mt-2 text-sm text-zinc-600">Answer: {q.answerText || "-"}</p>
            {q.type === "MCQ" ? (
              <p className="mt-1 text-xs text-zinc-400">
                Auto-graded: {q.isCorrect ? "Correct" : "Incorrect"}
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setGrades((g) => ({ ...g, [q.answerId]: true }))}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs font-medium",
                    grades[q.answerId] === true
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 text-zinc-600",
                  )}
                >
                  Correct
                </button>
                <button
                  onClick={() => setGrades((g) => ({ ...g, [q.answerId]: false }))}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs font-medium",
                    grades[q.answerId] === false
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-zinc-200 text-zinc-600",
                  )}
                >
                  Incorrect
                </button>
              </div>
            )}
          </Card>
        ))}
        <Button onClick={saveGrades} disabled={busy}>
          Save grading
        </Button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

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
        {evidence.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {evidence.map((e) => (
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
          placeholder="Write feedback for the student"
        />
        <Button onClick={addFeedback} disabled={busy} size="sm" className="mt-2">
          Post feedback
        </Button>
        {feedback.length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {feedback.map((f) => (
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
