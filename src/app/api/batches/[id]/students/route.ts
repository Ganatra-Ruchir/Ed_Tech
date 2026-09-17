import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function generateTempPassword(): string {
  // 10 url-safe chars, e.g. "aZ3f9kLp2Q" — enough entropy for a
  // faculty-relayed one-time password, easy to read/type over chat or email.
  return crypto.randomBytes(8).toString("base64url").slice(0, 10);
}

function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

const addStudentSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id: batchId } = await params;

  const allowed = await canAccessBatch(session, batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = addStudentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let user = await prisma.user.findUnique({ where: { email } });
  let temporaryPassword: string | null = null;

  if (user && user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "This email belongs to a non-student account and can't be added as a student." },
      { status: 409 },
    );
  }

  if (!user) {
    temporaryPassword = generateTempPassword();
    user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name?.trim() || nameFromEmail(email),
        role: "STUDENT",
        passwordHash: await hashPassword(temporaryPassword),
      },
    });
  }

  const existingMembership = await prisma.userBatch.findUnique({
    where: { userId_batchId: { userId: user.id, batchId } },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: `${user.name} is already enrolled in this batch.` },
      { status: 409 },
    );
  }

  await prisma.userBatch.create({ data: { userId: user.id, batchId } });

  await logAudit({
    actorId: session.sub,
    action: "batch.add_student",
    entityType: "Batch",
    entityId: batchId,
    metadata: { studentEmail: email, newAccount: Boolean(temporaryPassword) },
  });

  return NextResponse.json(
    {
      student: { id: user.id, name: user.name, email: user.email },
      // Only present when a new account was created — share this with the
      // student once. We don't have email delivery wired up, so the faculty
      // member relays it directly.
      temporaryPassword,
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id: batchId } = await params;

  const allowed = await canAccessBatch(session, batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const membership = await prisma.userBatch.findUnique({
    where: { userId_batchId: { userId, batchId } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.userBatch.delete({ where: { id: membership.id } });

  await logAudit({
    actorId: session.sub,
    action: "batch.remove_student",
    entityType: "Batch",
    entityId: batchId,
    metadata: { studentId: userId },
  });

  return NextResponse.json({ ok: true });
}
