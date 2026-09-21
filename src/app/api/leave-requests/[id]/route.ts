import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const raw = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review" }, { status: 400 });
  }
  const { id } = await params;
  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "This leave request has already been reviewed" }, { status: 409 });
  }

  const leaveRequest = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote || null,
      reviewerId: session.sub,
      reviewedAt: new Date(),
    },
    include: {
      faculty: { select: { name: true, email: true } },
      reviewer: { select: { name: true } },
      handoverFaculty: { select: { name: true } },
    },
  });
  await logAudit({
    actorId: session.sub,
    action: `leave_request.${parsed.data.status.toLowerCase()}`,
    entityType: "LeaveRequest",
    entityId: id,
    metadata: { facultyId: leaveRequest.facultyId },
  });

  return NextResponse.json({
    request: {
      ...leaveRequest,
      facultyName: leaveRequest.faculty.name,
      facultyEmail: leaveRequest.faculty.email,
      reviewerName: leaveRequest.reviewer?.name ?? null,
      handoverFacultyName: leaveRequest.handoverFaculty?.name ?? null,
    },
  });
}
