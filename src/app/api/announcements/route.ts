import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { storeFile } from "@/lib/storage";

export async function GET(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId") ?? undefined;

  if (batchId) {
    const allowed = await canAccessBatch(session, batchId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batchIds = batchId
    ? [batchId]
    : session.role === "ADMIN"
      ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
      : session.role === "FACULTY" && session.isCC
        ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
        : await userBatchIds(session.sub);

  const announcements = await prisma.announcement.findMany({
    where: { batchId: { in: batchIds } },
    include: { faculty: { select: { name: true } }, batch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  const batchId = String(formData.get("batchId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!batchId || !title || !body || title.length > 200 || body.length > 4000) return NextResponse.json({ error: "Batch, title, and message are required" }, { status: 400 });

  const allowed = await canAccessBatch(session, batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcement = await prisma.announcement.create({
    data: {
      batchId,
      facultyId: session.sub,
      title,
      body,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { batchId },
  });

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Only PDF files up to 20 MB are allowed" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeFile({ buffer, filename: file.name, contentType: "application/pdf", folder: "announcements" });
    await prisma.announcement.update({ where: { id: announcement.id }, data: { attachmentUrl: stored.url, attachmentStorageKey: stored.storageKey, attachmentName: file.name, attachmentType: "application/pdf", attachmentSize: buffer.byteLength } });
  }

  return NextResponse.json({ announcement }, { status: 201 });
}
