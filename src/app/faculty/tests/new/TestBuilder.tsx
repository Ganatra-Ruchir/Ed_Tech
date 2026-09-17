"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Label, Input, Textarea, Select } from "@/components/Field";
import { Button } from "@/components/Button";

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
    <div className="max-w-2xl space-y-5">
      <PageHeader title="New Test" />

      <Card className="space-y-4 p-4">
        <div>
          <Label>Batch</Label>
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-auto" />
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={q.key} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-zinc-900">Question {idx + 1}</span>
              <div className="flex items-center gap-2">
                <Select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.key, { type: e.target.value as Question["type"] })}
                  className="w-auto text-xs"
                >
                  <option value="MCQ">MCQ</option>
                  <option value="SHORT_ANSWER">Short answer</option>
                </Select>
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
            <Textarea
              value={q.text}
              onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
              rows={2}
              placeholder="Question text"
            />
            {q.type === "MCQ" && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt, i) => (
                  <Input
                    key={i}
                    value={opt}
                    onChange={(e) => updateOption(q.key, i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                ))}
                <button
                  onClick={() => updateQuestion(q.key, { options: [...q.options, ""] })}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  + Add option
                </button>
                <div>
                  <Label>Correct answer</Label>
                  <Select
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                    className="w-auto"
                  >
                    <option value="">Select correct option</option>
                    {q.options.filter(Boolean).map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </Card>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setQuestions((qs) => [...qs, newQuestion()])}>
          + Add question
        </Button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={submitting}>
          Save draft
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={submitting}>
          Publish to batch
        </Button>
      </div>
    </div>
  );
}
