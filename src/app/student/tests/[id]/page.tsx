import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { TestForm } from "./TestForm";

export default async function StudentTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test || !test.publishedAt) notFound();

  const batchIds = await userBatchIds(session!.sub);
  if (!batchIds.includes(test.batchId)) notFound();

  const existingResponse = await prisma.testResponse.findUnique({
    where: { testId_studentId: { testId: id, studentId: session!.sub } },
    include: { answers: true },
  });

  // This page is already fully dynamic (reads the session cookie), so
  // capturing the current time for a due-date comparison is safe here.
  // eslint-disable-next-line react-hooks/purity
  const isPastDue = Boolean(test.dueAt && test.dueAt.getTime() < Date.now());

  if (existingResponse) {
    const answerByQuestion = new Map(existingResponse.answers.map((a) => [a.questionId, a]));
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">{test.title}</h1>
        <p className="text-sm text-emerald-700">
          Submitted — score {existingResponse.score ?? "-"} / {existingResponse.maxScore ?? "-"}
        </p>
        <div className="space-y-4">
          {test.questions.map((q, idx) => {
            const answer = answerByQuestion.get(q.id);
            return (
              <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">
                  {idx + 1}. {q.text}
                </p>
                <p className="mt-2 text-sm text-slate-600">Your answer: {answer?.answerText ?? "-"}</p>
                {q.type === "MCQ" && (
                  <p className="mt-1 text-xs text-slate-400">
                    {answer?.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-slate-900">{test.title}</h1>
        <p className="mt-2 text-sm text-rose-600">This test is past its due date and can no longer be filled in.</p>
      </div>
    );
  }

  return (
    <TestForm
      testId={test.id}
      title={test.title}
      description={test.description}
      questions={test.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : null,
      }))}
    />
  );
}
