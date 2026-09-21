import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { contentTypeFor, validateDocumentUpload } from "@/lib/uploads";
import { storeFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

const metadataSchema = z.object({
  batchId: z.string().min(1),
  subject: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const guard = await requireRole("FACULTY", "STUDENT", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const batchIds = session.role === "ADMIN"
    ? (await prisma.batch.findMany({ select: { id: true } })).map((batch) => batch.id)
    : session.role === "FACULTY" && session.isCC
      ? (await prisma.batch.findMany({ select: { id: true } })).map((batch) => batch.id)
      : await userBatchIds(session.sub);
  const materials = await prisma.learningMaterial.findMany({
    where: { batchId: { in: batchIds } },
    include: { batch: { select: { name: true } }, faculty: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  const parsed = metadataSchema.safeParse({
    batchId: String(formData.get("batchId") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid material details" }, { status: 400 });
  if (!(session.isCC || await canAccessBatch(session, parsed.data.batchId))) {
    return NextResponse.json({ error: "You cannot add materials to this batch" }, { status: 403 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a material file" }, { status: 400 });
  const fileError = validateDocumentUpload({ name: file.name, size: file.size });
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = contentTypeFor(file.name);
  const stored = await storeFile({ buffer, filename: file.name, contentType: fileType, folder: "materials" });
  const material = await prisma.learningMaterial.create({
    data: {
      batchId: parsed.data.batchId,
      facultyId: session.sub,
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description || null,
      fileUrl: stored.url,
      storageKey: stored.storageKey,
      fileName: file.name,
      fileType,
      fileSize: buffer.byteLength,
    },
  });
  await logAudit({ actorId: session.sub, action: "material.create", entityType: "LearningMaterial", entityId: material.id, metadata: { batchId: material.batchId, subject: material.subject } });
  return NextResponse.json({ material }, { status: 201 });
}
