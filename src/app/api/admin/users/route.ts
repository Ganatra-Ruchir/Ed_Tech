import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const createUserSchema = z.object({
  role: z.enum(["STUDENT", "FACULTY"]),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200).optional(),
  branch: z.string().min(1).max(200).nullable().optional(),
  college: z.string().min(1).max(200).nullable().optional(),
  facultyType: z.string().max(50).nullable().optional(),
  isCC: z.boolean().optional(),
  salary: z.number().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  joiningDate: z.string().nullable().optional(),
  studentNumber: z.string().max(80).nullable().optional(),
  enrollmentNumber: z.string().max(80).nullable().optional(),
  ccName: z.string().max(200).nullable().optional(),
  scName: z.string().max(200).nullable().optional(),
  profileImageUrl: z.string().max(500).nullable().optional(),
});

function generateTempPassword() {
  return `${Math.random().toString(36).slice(2, 10)}!A1`;
}

export async function POST(request: Request) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;

  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide valid user details." }, { status: 400 });
  }

  const { password, role, ...rest } = parsed.data;
  const email = rest.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const finalPassword = password && password.trim() ? password : generateTempPassword();
  const user = await prisma.user.create({
    data: {
      ...rest,
      role,
      email,
      isCC: role === "FACULTY" ? Boolean(rest.isCC || rest.facultyType === "CC") : false,
      passwordHash: await hashPassword(finalPassword),
      dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : null,
      joiningDate: rest.joiningDate ? new Date(rest.joiningDate) : null,
      salary: typeof rest.salary === "number" ? rest.salary : null,
    },
  });

  await logAudit({
    actorId: guard.session.sub,
    action: role === "FACULTY" ? "user.create_faculty" : "user.create_student",
    entityType: "User",
    entityId: user.id,
    metadata: { email, role },
  });

  return NextResponse.json(
    {
      message: `${role === "FACULTY" ? "Faculty" : "Student"} created successfully.`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      temporaryPassword: finalPassword,
    },
    { status: 201 },
  );
}