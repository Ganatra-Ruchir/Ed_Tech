import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";

const bodySchema = z.object({
  batchId: z.string().min(1),
  studentId: z.string().min(1),
  action: z.enum(["check_in", "check_out", "absent", "present"]),
  date: z.string().optional(),
});

function dayStart(value?: string) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "STUDENT", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const search = new URL(request.url).searchParams;
  const batchId = search.get("batchId");
  const date = dayStart(search.get("date") ?? undefined);
  if (!batchId) return NextResponse.json({ error: "batchId is required" }, { status: 400 });
  if (session.role === "STUDENT" && !(await userBatchIds(session.sub)).includes(batchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "FACULTY" && !(session.isCC || (await canAccessBatch(session, batchId)))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const records = await prisma.attendance.findMany({ where: { batchId, date }, include: { student: { select: { id: true, name: true, email: true } } }, orderBy: { student: { name: "asc" } } });
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid attendance request" }, { status: 400 });
  if (!(session.isCC || (await canAccessBatch(session, parsed.data.batchId)))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // The target student must actually belong to the batch attendance is being
  // written for — otherwise a faculty member could write rows for a student in
  // a batch they don't teach by passing a mismatched studentId.
  const isMember = await prisma.userBatch.findUnique({
    where: { userId_batchId: { userId: parsed.data.studentId, batchId: parsed.data.batchId } },
    select: { id: true },
  });
  if (!isMember) return NextResponse.json({ error: "Student is not in this batch" }, { status: 400 });
  const date = dayStart(parsed.data.date);
  const current = await prisma.attendance.findUnique({ where: { batchId_studentId_date: { batchId: parsed.data.batchId, studentId: parsed.data.studentId, date } } });
  const now = new Date();
  const data = parsed.data.action === "check_in" ? { status: "PRESENT", checkedInAt: current?.checkedInAt ?? now } : parsed.data.action === "check_out" ? { status: "PRESENT", checkedOutAt: now } : { status: parsed.data.action === "absent" ? "ABSENT" : "PRESENT" };
  const record = await prisma.attendance.upsert({ where: { batchId_studentId_date: { batchId: parsed.data.batchId, studentId: parsed.data.studentId, date } }, create: { batchId: parsed.data.batchId, studentId: parsed.data.studentId, date, ...data }, update: data, include: { student: { select: { id: true, name: true, email: true } } } });
  return NextResponse.json({ record });
}