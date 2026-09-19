import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { storeFile } from "@/lib/storage";
import { validateDocumentUpload, contentTypeFor } from "@/lib/uploads";
import { logAudit } from "@/lib/audit";


export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "STUDENT", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const searchParams = new URL(request.url).searchParams;
  const batchId = searchParams.get("batchId");
  const assignmentId = searchParams.get("assignmentId");

  let where: Record<string, unknown> = batchId ? { batchId } : {};
  if (session.role === "STUDENT") {
    const batchIds = await userBatchIds(session.sub);
    where = { batchId: batchId && batchIds.includes(batchId) ? batchId : { in: batchIds } };
  } else if (session.role === "FACULTY" && !session.isCC) {
    const batchIds = await userBatchIds(session.sub);
    where = { batchId: batchId && batchIds.includes(batchId) ? batchId : { in: batchIds } };
  }
  if (assignmentId) where.id = assignmentId;

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      batch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assignments });
}

const metadataSchema = z.object({
  batchId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  dueAt: z.string().optional(),
});

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const parsed = metadataSchema.safeParse({
    batchId: String(formData.get("batchId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    dueAt: formData.get("dueAt") ? String(formData.get("dueAt")) : undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Batch and title are required" }, { status: 400 });

  if (!(session.isCC || (await canAccessBatch(session, parsed.data.batchId)))) {
    return NextResponse.json({ error: "You cannot assign work to this batch" }, { status: 403 });
  }

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const err = validateDocumentUpload({ name: file.name, size: file.size });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      batchId: parsed.data.batchId,
      createdByFacultyId: session.sub,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });

  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = contentTypeFor(file.name);
    const stored = await storeFile({
      buffer,
      filename: file.name,
      contentType,
      folder: "assignments",
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        attachmentUrl: stored.url,
        attachmentStorageKey: stored.storageKey,
        attachmentName: file.name,
        attachmentType: contentTypeFor(file.name),
        attachmentSize: buffer.byteLength,
      },
    });
  }

  await logAudit({ actorId: session.sub, action: "assignment.create", entityType: "Assignment", entityId: assignment.id });
  return NextResponse.json({ assignment }, { status: 201 });
}