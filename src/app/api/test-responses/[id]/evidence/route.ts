import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  tag: z.string().min(1).max(60),
  notes: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const response = await prisma.testResponse.findUnique({
    where: { id },
    include: { test: true },
  });
  if (!response) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessBatch(session, response.test.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid evidence payload" }, { status: 400 });

  const evidence = await prisma.evidence.create({
    data: {
      testResponseId: id,
      tag: parsed.data.tag,
      notes: parsed.data.notes ?? null,
      addedByFacultyId: session.sub,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "evidence.tag",
    entityType: "TestResponse",
    entityId: id,
    metadata: { tag: parsed.data.tag },
  });

  return NextResponse.json({ evidence }, { status: 201 });
}
