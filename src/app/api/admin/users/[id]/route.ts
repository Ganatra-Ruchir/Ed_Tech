import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { isValidDateKey } from "@/lib/calendar";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const nullableDate = z.union([z.string().refine(isValidDateKey, "Invalid date"), z.literal(""), z.null()]).optional();

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  branch: nullableText(200),
  college: nullableText(200),
  profileImageUrl: nullableText(500),
  dateOfBirth: nullableDate,
  facultyType: nullableText(50),
  isCC: z.boolean().optional(),
  salary: z.number().min(0).max(100_000_000).nullable().optional(),
  joiningDate: nullableDate,
  studentNumber: nullableText(80),
  enrollmentNumber: nullableText(80),
  ccName: nullableText(200),
  scName: nullableText(200),
});

function dateOrNull(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || (existing.role !== "STUDENT" && existing.role !== "FACULTY")) {
    return NextResponse.json({ error: "Student or faculty account not found" }, { status: 404 });
  }

  const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid user details" }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();
  const duplicate = await prisma.user.findFirst({ where: { email, id: { not: id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const shared = {
    name: data.name,
    email,
    ...(data.branch !== undefined ? { branch: data.branch || null } : {}),
    ...(data.college !== undefined ? { college: data.college || null } : {}),
    ...(data.profileImageUrl !== undefined ? { profileImageUrl: data.profileImageUrl || null } : {}),
    ...(data.dateOfBirth !== undefined ? { dateOfBirth: dateOrNull(data.dateOfBirth) } : {}),
  };
  const roleData = existing.role === "FACULTY"
    ? {
        ...(data.facultyType !== undefined ? { facultyType: data.facultyType || null } : {}),
        ...(data.isCC !== undefined || data.facultyType !== undefined ? { isCC: Boolean(data.isCC || data.facultyType === "CC") } : {}),
        ...(data.salary !== undefined ? { salary: data.salary } : {}),
        ...(data.joiningDate !== undefined ? { joiningDate: dateOrNull(data.joiningDate) } : {}),
      }
    : {
        ...(data.studentNumber !== undefined ? { studentNumber: data.studentNumber || null } : {}),
        ...(data.enrollmentNumber !== undefined ? { enrollmentNumber: data.enrollmentNumber || null } : {}),
        ...(data.ccName !== undefined ? { ccName: data.ccName || null } : {}),
        ...(data.scName !== undefined ? { scName: data.scName || null } : {}),
      };

  const user = await prisma.user.update({
    where: { id },
    data: { ...shared, ...roleData },
    select: { id: true, name: true, email: true, role: true },
  });
  await logAudit({
    actorId: guard.session.sub,
    action: existing.role === "FACULTY" ? "user.update_faculty" : "user.update_student",
    entityType: "User",
    entityId: id,
    metadata: { email, role: existing.role },
  });

  return NextResponse.json({ user });
}
