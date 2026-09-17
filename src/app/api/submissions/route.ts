import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { storeFile } from "@/lib/storage";
import { userBatchIds } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (session.role === "STUDENT") {
    where.studentId = session.sub;
  } else if (session.role === "FACULTY") {
    const batchIds = await userBatchIds(session.sub);
    where.batchId = batchId ? batchId : { in: batchIds };
    if (batchId && !batchIds.includes(batchId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (session.role === "ADMIN") {
    if (batchId) where.batchId = batchId;
  }

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true } },
      batch: { select: { id: true, name: true } },
      files: true,
      _count: { select: { evidence: true, feedback: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}

export async function POST(request: Request) {
  const guard = await requireRole("STUDENT");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "").trim();
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const batchIds = await userBatchIds(session.sub);
  if (batchIds.length === 0) {
    return NextResponse.json({ error: "You are not assigned to a batch" }, { status: 400 });
  }
  const batchId = batchIds[0];

  const fileEntries = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (fileEntries.length === 0) {
    return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
  }

  const submission = await prisma.submission.create({
    data: {
      studentId: session.sub,
      batchId,
      title,
      notes,
      status: "SUBMITTED",
    },
  });

  for (const file of fileEntries) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeFile({
      buffer,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: "uploads",
    });
    await prisma.submissionFile.create({
      data: {
        submissionId: submission.id,
        fileName: file.name,
        fileUrl: stored.url,
        fileType: file.type || "application/octet-stream",
        fileSize: buffer.byteLength,
      },
    });
  }

  await logAudit({
    actorId: session.sub,
    action: "submission.create",
    entityType: "Submission",
    entityId: submission.id,
  });

  return NextResponse.json({ submission }, { status: 201 });
}
