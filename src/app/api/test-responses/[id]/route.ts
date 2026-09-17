import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
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
  if (!response) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessBatch(session, response.test.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    response: {
      ...response,
      test: {
        ...response.test,
        questions: response.test.questions.map((q) => ({
          ...q,
          options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
        })),
      },
    },
  });
}

const gradeSchema = z.object({
  answers: z.array(z.object({ id: z.string().min(1), isCorrect: z.boolean() })),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const response = await prisma.testResponse.findUnique({
    where: { id },
    include: { test: true, answers: true },
  });
  if (!response) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessBatch(session, response.test.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = gradeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid grading payload" }, { status: 400 });

  const validIds = new Set(response.answers.map((a) => a.id));
  await prisma.$transaction(
    parsed.data.answers
      .filter((a) => validIds.has(a.id))
      .map((a) =>
        prisma.answer.update({ where: { id: a.id }, data: { isCorrect: a.isCorrect } }),
      ),
  );

  const refreshedAnswers = await prisma.answer.findMany({ where: { testResponseId: id } });
  const score = refreshedAnswers.filter((a) => a.isCorrect === true).length;

  const updated = await prisma.testResponse.update({
    where: { id },
    data: { score },
  });

  await logAudit({
    actorId: session.sub,
    action: "test_response.grade",
    entityType: "TestResponse",
    entityId: id,
    metadata: { score },
  });

  await recomputeKpisForStudentChange(response.studentId);

  return NextResponse.json({ response: updated });
}
