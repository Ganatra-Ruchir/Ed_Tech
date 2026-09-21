import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { recomputeKpisForStudentChange } from "@/lib/kpi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessBatch(session, test.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const responses = await prisma.testResponse.findMany({
    where: { testId: id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      answers: true,
      _count: { select: { evidence: true, feedback: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ responses });
}

const submitSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().min(1), answerText: z.string() }))
    .default([]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("STUDENT");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: { questions: true },
  });
  if (!test || !test.publishedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const batchIds = await userBatchIds(session.sub);
  if (!batchIds.includes(test.batchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (test.dueAt && test.dueAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This test is past its due date" }, { status: 400 });
  }

  const existing = await prisma.testResponse.findUnique({
    where: { testId_studentId: { testId: id, studentId: session.sub } },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already submitted this test" }, { status: 409 });
  }

  const parsed = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });

  const questionById = new Map(test.questions.map((q) => [q.id, q]));
  const seenQuestionIds = new Set<string>();
  const normalizedAnswers = parsed.data.answers.map((answer) => ({
    questionId: answer.questionId.trim(),
    answerText: answer.answerText.trim(),
  }));

  for (const answer of normalizedAnswers) {
    if (!answer.questionId || !answer.answerText) {
      return NextResponse.json({ error: "Answers cannot be blank" }, { status: 400 });
    }
    if (!questionById.has(answer.questionId) || seenQuestionIds.has(answer.questionId)) {
      return NextResponse.json({ error: "Each question may only be answered once" }, { status: 400 });
    }
    seenQuestionIds.add(answer.questionId);
  }

  const missingRequired = test.questions.some((question) => question.required && !seenQuestionIds.has(question.id));
  if (missingRequired) {
    return NextResponse.json(
      { error: "All required questions must be answered" },
      { status: 400 },
    );
  }

  const answerData = test.questions.map((question) => {
    const answer = normalizedAnswers.find((entry) => entry.questionId === question.id);
    if (!answer) {
      return null;
    }
    const isCorrect =
      question.type === "MCQ" ? answer.answerText === question.correctAnswer : null;
    return { questionId: question.id, answerText: answer.answerText, isCorrect };
  }).filter((entry): entry is { questionId: string; answerText: string; isCorrect: boolean | null } => entry !== null);

  const mcqScore = answerData.reduce((sum, answer) => {
    const question = questionById.get(answer.questionId);
    return sum + (answer.isCorrect === true ? question?.points ?? 0 : 0);
  }, 0);
  // Short answers start ungraded (0) until faculty scores them; MCQs auto-grade.
  const score = mcqScore;
  const maxScore = test.questions.reduce((sum, question) => sum + question.points, 0);

  const response = await prisma.testResponse.create({
    data: {
      testId: id,
      studentId: session.sub,
      submittedAt: new Date(),
      score,
      maxScore,
      answers: { create: answerData },
    },
    include: { answers: true },
  });

  await logAudit({
    actorId: session.sub,
    action: "test_response.submit",
    entityType: "TestResponse",
    entityId: response.id,
  });

  await recomputeKpisForStudentChange(session.sub);

  return NextResponse.json({ response }, { status: 201 });
}
