import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { storeFile } from "@/lib/storage";
import { validateAvatarUpload, validateDocumentUpload, contentTypeFor } from "@/lib/uploads";

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

  const ALLOWED_CATEGORIES = ["IMPORTANT", "ACADEMIC", "ASSIGNMENT", "EVENT", "GENERAL"];
  const rawCategory = String(formData.get("category") ?? "GENERAL").toUpperCase();
  const category = ALLOWED_CATEGORIES.includes(rawCategory) ? rawCategory : "GENERAL";
  const ALLOWED_BACKGROUNDS = ["PLAIN", "CORAL", "SKY", "MINT", "LILAC", "INK"];
  const rawBackground = String(formData.get("backgroundTheme") ?? "PLAIN").toUpperCase();
  const backgroundTheme = ALLOWED_BACKGROUNDS.includes(rawBackground) ? rawBackground : "PLAIN";
  const pinned = String(formData.get("pinned") ?? "") === "true";
  const requireAck = String(formData.get("requireAck") ?? "") === "true";
  const allowComments = String(formData.get("allowComments") ?? "true") !== "false";
  const file = formData.get("file");
  const banner = formData.get("banner");

  if (file instanceof File && file.size > 0) {
    const error = validateDocumentUpload({ name: file.name, size: file.size });
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  if (banner instanceof File && banner.size > 0) {
    const error = validateAvatarUpload({ name: banner.name, size: banner.size });
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  const allowed = await canAccessBatch(session, batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attachmentUpload = file instanceof File && file.size > 0 ? (async () => {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = contentTypeFor(file.name);
    const stored = await storeFile({ buffer, filename: file.name, contentType, folder: "announcements" });
    return { attachmentUrl: stored.url, attachmentStorageKey: stored.storageKey, attachmentName: file.name, attachmentType: contentType, attachmentSize: buffer.byteLength };
  })() : Promise.resolve({});

  const bannerUpload = banner instanceof File && banner.size > 0 ? (async () => {
    const buffer = Buffer.from(await banner.arrayBuffer());
    const contentType = contentTypeFor(banner.name);
    const stored = await storeFile({ buffer, filename: banner.name, contentType, folder: "announcements" });
    return { bannerUrl: stored.url, bannerStorageKey: stored.storageKey };
  })() : Promise.resolve({});

  const [attachmentData, bannerData] = await Promise.all([attachmentUpload, bannerUpload]);
  const announcement = await prisma.announcement.create({
    data: {
      batchId,
      facultyId: session.sub,
      title,
      body,
      category,
      backgroundTheme,
      pinned,
      requireAck,
      allowComments,
      ...attachmentData,
      ...bannerData,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { batchId },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
