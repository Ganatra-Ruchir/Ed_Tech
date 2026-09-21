import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  comment: z.string().min(1).max(4000),
  rating: z.number().int().min(1).max(5),
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment and a 1 to 5 star rating are required" }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: {
      testResponseId: id,
      facultyId: session.sub,
      comment: parsed.data.comment,
      rating: parsed.data.rating,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "feedback.add",
    entityType: "TestResponse",
    entityId: id,
  });

  return NextResponse.json({ feedback }, { status: 201 });
}
