import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessSubmission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  comment: z.string().min(1).max(4000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessSubmission(session, submission);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: {
      submissionId: id,
      facultyId: session.sub,
      comment: parsed.data.comment,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "feedback.add",
    entityType: "Submission",
    entityId: id,
  });

  return NextResponse.json({ feedback }, { status: 201 });
}
