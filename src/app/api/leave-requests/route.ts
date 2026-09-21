import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { isValidDateKey } from "@/lib/calendar";

const requestSchema = z.object({
  startDate: z.string().refine(isValidDateKey, "Invalid start date"),
  endDate: z.string().refine(isValidDateKey, "Invalid end date"),
  reason: z.string().trim().min(5, "Please provide a reason").max(1000),
  handoverFacultyId: z.string().trim().min(1).nullable().optional(),
  handoverNotes: z.string().trim().max(1500).nullable().optional(),
});

const requestInclude = {
  faculty: { select: { name: true, email: true } },
  reviewer: { select: { name: true } },
  handoverFaculty: { select: { name: true } },
} as const;

function serializeRequest(request: Awaited<ReturnType<typeof prisma.leaveRequest.findFirst>> & {
  faculty?: { name: string; email: string };
  reviewer?: { name: string } | null;
  handoverFaculty?: { name: string } | null;
}) {
  return {
    ...request,
    facultyName: request.faculty?.name ?? "Faculty member",
    facultyEmail: request.faculty?.email ?? "",
    reviewerName: request.reviewer?.name ?? null,
    handoverFacultyName: request.handoverFaculty?.name ?? null,
  };
}

export async function GET() {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const requests = await prisma.leaveRequest.findMany({
    where: session.role === "FACULTY" ? { facultyId: session.sub } : undefined,
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests: requests.map(serializeRequest) });
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid leave request" }, { status: 400 });
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date must be on or after the start date" }, { status: 400 });
  }
  if (parsed.data.handoverFacultyId === session.sub) {
    return NextResponse.json({ error: "Choose another faculty member for handover" }, { status: 400 });
  }
  if (parsed.data.handoverNotes && !parsed.data.handoverFacultyId) {
    return NextResponse.json({ error: "Select a faculty member for this handover" }, { status: 400 });
  }
  if (parsed.data.handoverFacultyId) {
    const handoverFaculty = await prisma.user.findFirst({
      where: { id: parsed.data.handoverFacultyId, role: "FACULTY" },
      select: { id: true },
    });
    if (!handoverFaculty) return NextResponse.json({ error: "Selected handover faculty was not found" }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      facultyId: session.sub,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason,
      handoverFacultyId: parsed.data.handoverFacultyId || null,
      handoverNotes: parsed.data.handoverNotes || null,
    },
    include: requestInclude,
  });
  await logAudit({
    actorId: session.sub,
    action: "leave_request.create",
    entityType: "LeaveRequest",
    entityId: leaveRequest.id,
    metadata: { startDate: leaveRequest.startDate, endDate: leaveRequest.endDate, handoverFacultyId: leaveRequest.handoverFacultyId },
  });

  return NextResponse.json({ request: serializeRequest(leaveRequest) }, { status: 201 });
}
