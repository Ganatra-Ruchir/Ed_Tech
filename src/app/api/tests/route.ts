import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { userBatchIds, canAccessBatch } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId") ?? undefined;

  const where: Record<string, unknown> = {};

  if (session.role === "STUDENT") {
    const batchIds = await userBatchIds(session.sub);
    where.batchId = { in: batchIds };
    where.publishedAt = { not: null };
  } else if (session.role === "FACULTY") {
    if (session.isCC) {
      if (batchId) where.batchId = batchId;
    } else {
      const batchIds = await userBatchIds(session.sub);
      where.batchId = batchId ? batchId : { in: batchIds };
      if (batchId && !batchIds.includes(batchId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  } else if (batchId) {
    where.batchId = batchId;
  }

  const tests = await prisma.test.findMany({
    where,
    include: {
      batch: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { questions: true, responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (session.role === "STUDENT") {
    const myResponses = await prisma.testResponse.findMany({
      where: { studentId: session.sub, testId: { in: tests.map((t) => t.id) } },
      select: { testId: true, submittedAt: true, score: true, maxScore: true },
    });
    const byTest = new Map(myResponses.map((r) => [r.testId, r]));
    return NextResponse.json({
      tests: tests.map((t) => ({ ...t, myResponse: byTest.get(t.id) ?? null })),
    });
  }

  return NextResponse.json({ tests });
}

const questionSchema = z.object({
  type: z.enum(["MCQ", "SHORT_ANSWER"]),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().optional(),
  required: z.boolean().default(true),
  points: z.number().int().min(1).max(100).default(1),
});

const createTestSchema = z.object({
  batchId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime().optional(),
  publish: z.boolean().default(false),
  questions: z.array(questionSchema).min(1),
});

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const parsed = createTestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const allowed = await canAccessBatch(session, data.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  for (const q of data.questions) {
    if (q.type === "MCQ") {
      const options = (q.options ?? []).map((option) => option.trim()).filter(Boolean);
      if (options.length < 2 || !q.correctAnswer || !options.includes(q.correctAnswer.trim())) {
        return NextResponse.json(
          { error: "MCQ questions require at least 2 valid options and a correct answer matching one option" },
          { status: 400 },
        );
      }
      if (new Set(options).size !== options.length) {
        return NextResponse.json({ error: "MCQ options must be unique" }, { status: 400 });
      }
    }
  }

  const test = await prisma.test.create({
    data: {
      batchId: data.batchId,
      createdByFacultyId: session.sub,
      title: data.title,
      description: data.description ?? null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      publishedAt: data.publish ? new Date() : null,
      questions: {
        create: data.questions.map((q, idx) => ({
          type: q.type,
          text: q.text,
          optionsJson: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer ?? null,
          order: idx + 1,
          required: q.required,
          points: q.points,
        })),
      },
    },
    include: { questions: true },
  });

  await logAudit({
    actorId: session.sub,
    action: data.publish ? "test.create_and_publish" : "test.create_draft",
    entityType: "Test",
    entityId: test.id,
  });

  return NextResponse.json({ test }, { status: 201 });
}
