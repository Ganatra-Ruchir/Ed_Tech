import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { parseDateInput } from "@/lib/qa-validation";
import { calculateAttendanceSummary } from "@/lib/attendance-summary";

const bodySchema = z.object({
  batchId: z.string().min(1),
  studentId: z.string().min(1),
  action: z.enum(["check_in", "check_out", "absent", "present"]),
  date: z.string().optional(),
});

const bulkBodySchema = z.object({
  batchId: z.string().min(1),
  date: z.string().min(1),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT"]),
  })).min(1),
});

function dayStart(value?: string) {
  const date = value ? parseDateInput(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "STUDENT", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const search = new URL(request.url).searchParams;
  const batchId = search.get("batchId");
  if (!batchId) return NextResponse.json({ error: "batchId is required" }, { status: 400 });

  let date: Date;
  try {
    date = dayStart(search.get("date") ?? undefined);
  } catch {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (session.role === "STUDENT") {
    const studentBatchIds = await userBatchIds(session.sub);
    if (!studentBatchIds.includes(batchId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const records = await prisma.attendance.findMany({
      where: { batchId, date, studentId: session.sub },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: "asc" } },
    });
    return NextResponse.json({ records });
  }
  if (session.role === "FACULTY" && !(session.isCC || (await canAccessBatch(session, batchId)))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [records, allRecords] = await Promise.all([
    prisma.attendance.findMany({ where: { batchId, date }, include: { student: { select: { id: true, name: true, email: true } } }, orderBy: { student: { name: "asc" } } }),
    prisma.attendance.findMany({ where: { batchId }, select: { studentId: true, status: true, date: true } }),
  ]);
  return NextResponse.json({ records, ...calculateAttendanceSummary(allRecords) });
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const payload = await request.json().catch(() => null);
  const bulkParsed = bulkBodySchema.safeParse(payload);
  if (bulkParsed.success) {
    const { batchId, records } = bulkParsed.data;
    if (!(session.isCC || (await canAccessBatch(session, batchId)))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (new Set(records.map((record) => record.studentId)).size !== records.length) {
      return NextResponse.json({ error: "Each student may only be marked once" }, { status: 400 });
    }
    const members = await prisma.userBatch.findMany({
      where: { batchId, user: { role: "STUDENT" } },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((member) => member.userId));
    if (records.length !== memberIds.size || records.some((record) => !memberIds.has(record.studentId))) {
      return NextResponse.json({ error: "Mark every student in the selected batch before saving" }, { status: 400 });
    }
    let date: Date;
    try {
      date = dayStart(bulkParsed.data.date);
    } catch {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    await prisma.$transaction(records.map((record) => prisma.attendance.upsert({
      where: { batchId_studentId_date: { batchId, studentId: record.studentId, date } },
      create: { batchId, studentId: record.studentId, date, status: record.status },
      update: { status: record.status, checkedInAt: null, checkedOutAt: null },
    })));
    const savedRecords = await prisma.attendance.findMany({
      where: { batchId, date },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: "asc" } },
    });
    const allRecords = await prisma.attendance.findMany({ where: { batchId }, select: { studentId: true, status: true, date: true } });
    return NextResponse.json({ records: savedRecords, ...calculateAttendanceSummary(allRecords) });
  }

  const parsed = bodySchema.safeParse(payload);
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
