import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"]).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(800).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task update" }, { status: 400 });
  }

  const existing = await prisma.facultyTask.findFirst({ where: { id, facultyId: guard.session.sub }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const task = await prisma.facultyTask.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.dueDate !== undefined
        ? { dueDate: parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T12:00:00.000Z`) : null }
        : {}),
    },
  });
  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const result = await prisma.facultyTask.deleteMany({ where: { id, facultyId: guard.session.sub } });
  if (result.count === 0) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
