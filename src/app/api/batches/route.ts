import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { userBatchIds } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const where =
    session.role === "ADMIN" || session.isCC
      ? {}
      : { id: { in: await userBatchIds(session.sub) } };

  const batches = await prisma.batch.findMany({
    where,
    include: { _count: { select: { members: true, submissions: true, tests: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ batches });
}

const createBatchSchema = z.object({
  name: z.string().min(1).max(200),
  department: z.string().min(1).max(200),
  semester: z.string().min(1).max(50),
});

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const parsed = createBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Name, department, and semester are all required" }, { status: 400 });
  }

  const batch = await prisma.batch.create({
    data: {
      ...parsed.data,
      // Faculty who create a batch are added to it so they can manage it
      // immediately; admins aren't students/faculty of any batch.
      members: session.role === "FACULTY" ? { create: [{ userId: session.sub }] } : undefined,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "batch.create",
    entityType: "Batch",
    entityId: batch.id,
  });

  return NextResponse.json({ batch }, { status: 201 });
}
