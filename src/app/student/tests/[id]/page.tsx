import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarClock,
  ListChecks,
  MessageSquare,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { Card } from "@/components/Card";
import { Tag } from "@/components/Tag";
import { Avatar } from "@/components/Avatar";
import { LinkButton } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { TestForm } from "./TestForm";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function BackLink() {
  return (
    <Link
      href="/student/tests"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-[#ef5b3f]"
    >
      <ArrowLeft size={13} /> Back to tests
    </Link>
  );
}

export default async function StudentTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      createdBy: { select: { name: true } },
    },
  });
  if (!test || !test.publishedAt) notFound();

  const batchIds = await userBatchIds(session!.sub);
  if (!batchIds.includes(test.batchId)) notFound();

  const existingResponse = await prisma.testResponse.findUnique({
    where: { testId_studentId: { testId: id, studentId: session!.sub } },
    include: {
      answers: true,
      feedback: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      evidence: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  // This page is already fully dynamic (reads the session cookie), so
  // capturing the current time for a due-date comparison is safe here.
  // eslint-disable-next-line react-hooks/purity
  const isPastDue = Boolean(test.dueAt && test.dueAt.getTime() < Date.now());

  if (existingResponse) {
    const answerByQuestion = new Map(existingResponse.answers.map((a) => [a.questionId, a]));
    const score = existingResponse.score ?? 0;
    const maxScore = existingResponse.maxScore ?? test.questions.reduce((sum, question) => sum + question.points, 0);
    const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const hasShortAnswers = test.questions.some((q) => q.type === "SHORT_ANSWER");

    return (
      <div className="max-w-3xl space-y-5">
        <BackLink />

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[17px] font-semibold text-zinc-900">{test.title}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <CheckCircle2 size={12} /> Completed
                </span>
              </div>
              {test.description && <p className="mt-1 text-[13px] text-zinc-600">{test.description}</p>}
              <p className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <ListChecks size={12} /> {test.questions.length} question{test.questions.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> Submitted {fmtDateTime(existingResponse.submittedAt)}
                </span>
                <span>Created by {test.createdBy.name}</span>
              </p>
            </div>
            <div className="min-w-[160px]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Score</p>
              <p className="text-2xl font-bold text-zinc-900">
                {score} <span className="text-base font-medium text-zinc-400">/ {maxScore}</span>
              </p>
              <ProgressBar value={scorePct} className="mt-2 !bg-[#ef5b3f]/10 [&>div]:!bg-[#ef5b3f]" />
              <p className="mt-1 text-[11px] text-zinc-400">{scorePct.toFixed(0)}% of the marks available</p>
            </div>
          </div>

          {hasShortAnswers && (
            <p className="mt-4 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              Multiple-choice answers are scored automatically. Short answers are marked by your faculty, so your
              score may change after review.
            </p>
          )}
        </Card>

        <div className="space-y-3">
          {test.questions.map((q, idx) => {
            const answer = answerByQuestion.get(q.id);
            const correct = answer?.isCorrect;
            return (
              <Card key={q.id} className="p-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-zinc-900">{q.text}</p>
                      {q.type === "MCQ" ? (
                        correct ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 size={11} /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                            <XCircle size={11} /> Incorrect
                          </span>
                        )
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                          Faculty marked
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 rounded-md border border-zinc-100 bg-zinc-50/70 px-3 py-2">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">Your answer</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-zinc-700">
                        {answer?.answerText || <span className="text-zinc-400">No answer recorded.</span>}
                      </p>
                    </div>

                    {q.type === "MCQ" && correct === false && q.correctAnswer && (
                      <p className="mt-2 text-[12.5px] text-zinc-600">
                        <span className="font-medium text-emerald-700">Correct answer:</span> {q.correctAnswer}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {existingResponse.feedback.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <MessageSquare size={14} className="text-[#ef5b3f]" /> Faculty Feedback
            </h2>
            <ul className="space-y-2.5">
              {existingResponse.feedback.map((f) => (
                <li key={f.id}>
                  <Card className="p-3.5">
                    <div className="flex items-start gap-3">
                      <Avatar name={f.faculty.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-zinc-900">{f.faculty.name}</p>
                        <p className="text-[11px] text-zinc-400">{fmtDateTime(f.createdAt)}</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                          {f.comment}
                        </p>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {existingResponse.evidence.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <Sparkles size={14} className="text-[#ef5b3f]" /> Evidence Tags
            </h2>
            <Card className="p-4">
              <ul className="space-y-2.5">
                {existingResponse.evidence.map((e) => (
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
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="max-w-2xl space-y-5">
        <BackLink />
        <Card className="p-5">
          <h1 className="text-[17px] font-semibold text-zinc-900">{test.title}</h1>
          {test.description && <p className="mt-1 text-[13px] text-zinc-600">{test.description}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} /> Was due {fmtDate(test.dueAt)}
            </span>
            <span>Created by {test.createdBy.name}</span>
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              This test is past its due date and can no longer be filled in. Speak to your faculty if you think this
              is a mistake.
            </span>
          </div>
          <div className="mt-4">
            <LinkButton href="/student/tests" size="sm" variant="secondary">
              <ArrowLeft size={13} /> Back to tests
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TestForm
      testId={test.id}
      title={test.title}
      description={test.description}
      dueLabel={test.dueAt ? fmtDate(test.dueAt) : null}
      questions={test.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : null,
        required: q.required,
        points: q.points,
      }))}
    />
  );
}
