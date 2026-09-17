"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  key: string;
  type: "MCQ" | "SHORT_ANSWER";
  text: string;
  options: string[];
  correctAnswer: string;
};

function newQuestion(): Question {
  return {
    key: crypto.randomUUID(),
    type: "MCQ",
    text: "",
    options: ["", ""],
    correctAnswer: "",
  };
}

export function TestBuilder({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateQuestion(key: string, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(key: string, index: number, value: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== key) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      }),
    );
  }

  async function handleSubmit(publish: boolean) {
    setError(null);
    if (!batchId) {
      setError("Select a batch.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        setError("Every question needs text.");
        return;
      }
      if (q.type === "MCQ") {
        const cleanOptions = q.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOptions.length < 2 || !q.correctAnswer.trim()) {
          setError("MCQ questions need at least 2 options and a correct answer.");
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          title,
          description: description || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          publish,
          questions: questions.map((q) => ({
            type: q.type,
            text: q.text,
            options: q.type === "MCQ" ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
            correctAnswer: q.type === "MCQ" ? q.correctAnswer : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to create test");
        return;
      }
      router.push(`/faculty/tests/${data.test.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">New Test</h1>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Batch</label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.key} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Question {idx + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.key, { type: e.target.value as Question["type"] })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="MCQ">MCQ</option>
                  <option value="SHORT_ANSWER">Short answer</option>
                </select>
                {questions.length > 1 && (
                  <button
                    onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={q.text}
              onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
              rows={2}
              placeholder="Question text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {q.type === "MCQ" && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(e) => updateOption(q.key, i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <button
                  onClick={() => updateQuestion(q.key, { options: [...q.options, ""] })}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  + Add option
                </button>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Correct answer</label>
                  <select
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select correct option</option>
                    {q.options.filter(Boolean).map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          + Add question
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Publish to batch
        </button>
      </div>
    </div>
  );
}
