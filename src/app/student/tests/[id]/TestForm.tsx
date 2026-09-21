"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, AlertCircle, CalendarClock, ListChecks, Check } from "lucide-react";
import { Card } from "@/components/Card";
import { Textarea } from "@/components/Field";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";

type Question = {
  id: string;
  type: "MCQ" | "SHORT_ANSWER";
  text: string;
  options: string[] | null;
  required: boolean;
  points: number;
};

export function TestForm({
  testId,
  title,
  description,
  dueLabel,
  questions,
}: {
  testId: string;
  title: string;
  description: string | null;
  /** Pre-formatted on the server so this component never derives "now". */
  dueLabel: string | null;
  questions: Question[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const isAnswered = (q: Question) => Boolean((answers[q.id] ?? "").trim());
  const answeredCount = questions.filter(isAnswered).length;
  const progress = questions.length === 0 ? 0 : (answeredCount / questions.length) * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = questions
      .map((q) => ({ questionId: q.id, answerText: (answers[q.id] ?? "").trim() }))
      .filter((answer) => answer.answerText);
    if (questions.some((q) => q.required && !isAnswered(q))) {
      setShowMissing(true);
      setError("Please answer every required question before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tests/${testId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to submit. Please try again.");
        return;
      }
      // The server component re-renders into its "completed" branch once the
      // response row exists.
      router.refresh();
    } catch {
      setError("Network error — your answers were not submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <Link
        href="/student/tests"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-[#ef5b3f]"
      >
        <ArrowLeft size={13} /> Back to tests
      </Link>

      <Card className="p-5">
        <h1 className="text-[17px] font-semibold text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-zinc-600">{description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <ListChecks size={12} /> {questions.length} question{questions.length === 1 ? "" : "s"}
          </span>
          {dueLabel && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} /> Due {dueLabel}
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Progress</p>
            <p className="text-[12px] font-medium text-zinc-600">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          <ProgressBar value={progress} className="mt-1.5 !bg-[#ef5b3f]/10 [&>div]:!bg-[#ef5b3f]" />
        </div>
      </Card>

      {questions.map((q, idx) => {
        const answered = isAnswered(q);
        const missing = showMissing && q.required && !answered;
        return (
          <Card key={q.id} className={`p-4 ${missing ? "!border-rose-300" : ""}`}>
            <div className="flex items-start gap-2.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  answered ? "bg-[#ef5b3f] text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {answered ? <Check size={12} /> : idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-zinc-900">
                  {q.text} {q.required && <span className="text-[#ef5b3f]" aria-label="required">*</span>}
                </p>
                <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wide text-zinc-400">
                  {q.type === "MCQ" ? "Multiple choice" : "Short answer"} · {q.points} {q.points === 1 ? "point" : "points"}{q.required ? "" : " · Optional"}
                </p>

                {q.type === "MCQ" && q.options && q.options.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {q.options.map((opt) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <motion.label
                          key={opt}
                          whileTap={{ scale: 0.995 }}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors ${
                            selected
                              ? "border-[#ef5b3f] bg-[#ef5b3f]/[0.05] text-zinc-900"
                              : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={selected}
                            onChange={() => setAnswer(q.id, opt)}
                            className="accent-[#ef5b3f]"
                          />
                          {opt}
                        </motion.label>
                      );
                    })}
                  </div>
                ) : (
                  <Textarea
                    rows={3}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Type your answer here"
                    className="mt-3 focus:!border-[#ef5b3f]/40 focus:!ring-[#ef5b3f]/10"
                  />
                )}

                {missing && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-rose-600">
                    <AlertCircle size={12} /> This required question still needs an answer.
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {error && (
        <p className="flex items-start gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-[12px] text-zinc-500">
          {answeredCount} of {questions.length} answered · answers can only be submitted once.
        </p>
        <Button
          type="submit"
          disabled={submitting}
          className="!bg-[#ef5b3f] hover:!bg-[#d9472e] disabled:!bg-[#ef5b3f]/40"
        >
          {submitting ? "Submitting…" : "Submit answers"}
        </Button>
      </div>
    </form>
  );
}
