import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      batch: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessBatch(session, test.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (session.role === "STUDENT") {
    if (!test.publishedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const myResponse = await prisma.testResponse.findUnique({
      where: { testId_studentId: { testId: id, studentId: session.sub } },
      include: { answers: true },
    });
    return NextResponse.json({
      test: {
        ...test,
        questions: test.questions.map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
          order: q.order,
        })),
      },
      myResponse,
    });
  }

  return NextResponse.json({
    test: {
      ...test,
      questions: test.questions.map((q) => ({
        ...q,
        options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
      })),
    },
  });
}

const patchSchema = z.object({
  publish: z.boolean().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: Request,
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

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const updated = await prisma.test.update({
    where: { id },
    data: {
      ...(parsed.data.publish !== undefined
        ? { publishedAt: parsed.data.publish ? new Date() : null }
        : {}),
      ...(parsed.data.dueAt !== undefined
        ? { dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null }
        : {}),
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "test.update",
    entityType: "Test",
    entityId: id,
    metadata: parsed.data,
  });

  return NextResponse.json({ test: updated });
}
