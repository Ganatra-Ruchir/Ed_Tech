import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Add a task title").max(160),
  description: z.string().trim().max(800).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET() {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;

  const tasks = await prisma.facultyTask.findMany({
    where: { facultyId: guard.session.sub },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task" }, { status: 400 });
  }

  const task = await prisma.facultyTask.create({
    data: {
      facultyId: guard.session.sub,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T12:00:00.000Z`) : null,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}
