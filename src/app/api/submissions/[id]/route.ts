import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessSubmission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { recomputeKpisForStudentChange } from "@/lib/kpi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      batch: true,
      files: true,
      evidence: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      feedback: { include: { faculty: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canAccessSubmission(session, submission);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ submission });
}

const statusSchema = z.object({
  status: z.enum(["IN_REVIEW", "APPROVED", "NEEDS_REVISION"]),
});

export async function PATCH(
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

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const isFinal = parsed.data.status === "APPROVED" || parsed.data.status === "NEEDS_REVISION";

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      status: parsed.data.status,
      reviewedAt: isFinal ? new Date() : submission.reviewedAt,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: `submission.set_status.${parsed.data.status.toLowerCase()}`,
    entityType: "Submission",
    entityId: id,
    metadata: { previousStatus: submission.status },
  });

  await recomputeKpisForStudentChange(submission.studentId);

  return NextResponse.json({ submission: updated });
}
