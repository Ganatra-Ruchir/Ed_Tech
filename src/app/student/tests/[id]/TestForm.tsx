"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Textarea } from "@/components/Field";
import { Button } from "@/components/Button";

type Question = {
  id: string;
  type: "MCQ" | "SHORT_ANSWER";
  text: string;
  options: string[] | null;
};

export function TestForm({
  testId,
  title,
  description,
  questions,
}: {
  testId: string;
  title: string;
  description: string | null;
  questions: Question[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = questions.map((q) => ({ questionId: q.id, answerText: answers[q.id] ?? "" }));
    if (payload.some((a) => !a.answerText.trim())) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tests/${testId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <PageHeader title={title} description={description ?? undefined} />

      {questions.map((q, idx) => (
        <Card key={q.id} className="p-4">
          <p className="mb-3 text-sm font-medium text-zinc-900">
            {idx + 1}. {q.text}
          </p>
          {q.type === "MCQ" && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                    className="accent-zinc-900"
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              rows={3}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Your answer"
            />
          )}
        </Card>
      ))}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit answers"}
      </Button>
    </form>
  );
}
