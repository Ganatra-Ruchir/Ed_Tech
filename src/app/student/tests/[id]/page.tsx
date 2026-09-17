import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
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
        <PageHeader title={test.title} />
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={15} /> Submitted — score {existingResponse.score ?? "-"} / {existingResponse.maxScore ?? "-"}
        </p>
        <div className="space-y-3">
          {test.questions.map((q, idx) => {
            const answer = answerByQuestion.get(q.id);
            return (
              <Card key={q.id} className="p-4">
                <p className="text-sm font-medium text-zinc-900">
                  {idx + 1}. {q.text}
                </p>
                <p className="mt-2 text-sm text-zinc-600">Your answer: {answer?.answerText ?? "-"}</p>
                {q.type === "MCQ" && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {answer?.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="max-w-2xl space-y-2">
        <PageHeader title={test.title} />
        <p className="text-sm text-rose-600">This test is past its due date and can no longer be filled in.</p>
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
