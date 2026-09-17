import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessBatch } from "@/lib/permissions";
import { GradingPanel } from "./GradingPanel";

function fmtDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function TestResponseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const response = await prisma.testResponse.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      test: { include: { questions: { orderBy: { order: "asc" } }, batch: true } },
      answers: true,
      evidence: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      feedback: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!response) notFound();

  const allowed = await canAccessBatch(session!, response.test.batchId);
  if (!allowed) notFound();

  const answerByQuestion = new Map(response.answers.map((a) => [a.questionId, a]));

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{response.test.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {response.student.name} · {response.test.batch.name} · Submitted {fmtDateTime(response.submittedAt)}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            Score: {response.score ?? "-"} / {response.maxScore ?? "-"}
          </p>
        </div>

        <GradingPanel
          responseId={response.id}
          questions={response.test.questions.map((q) => {
            const answer = answerByQuestion.get(q.id);
            return {
              id: q.id,
              text: q.text,
              type: q.type,
              answerId: answer?.id ?? "",
              answerText: answer?.answerText ?? "",
              isCorrect: answer?.isCorrect ?? null,
            };
          })}
          evidence={response.evidence.map((e) => ({
            id: e.id,
            tag: e.tag,
            notes: e.notes,
            faculty: e.faculty.name,
          }))}
          feedback={response.feedback.map((f) => ({
            id: f.id,
            comment: f.comment,
            faculty: f.faculty.name,
            createdAt: f.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
