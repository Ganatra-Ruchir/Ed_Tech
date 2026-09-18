import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { storeFile, deleteFile } from "@/lib/storage";
import { validateAvatarUpload, contentTypeFor } from "@/lib/uploads";
import { logAudit } from "@/lib/audit";

/**
 * Upload / replace the signed-in user's profile picture. Any role may set
 * their own avatar; there is no cross-user path here, so a session check is
 * the only authorization needed. Previous avatar blobs are best-effort
 * deleted so storage doesn't accumulate orphans.
 */
export async function POST(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  const err = validateAvatarUpload({ name: file.name, size: file.size });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const existing = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { profileImageStorageKey: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeFile({
    buffer,
    filename: file.name,
    contentType: file.type || contentTypeFor(file.name),
    folder: "uploads",
  });

  await prisma.user.update({
    where: { id: session.sub },
    data: { profileImageUrl: stored.url, profileImageStorageKey: stored.storageKey },
  });

  if (existing?.profileImageStorageKey) {
    await deleteFile(existing.profileImageStorageKey).catch(() => {});
  }

  await logAudit({ actorId: session.sub, action: "profile.avatar.update", entityType: "User", entityId: session.sub });

  return NextResponse.json({ url: stored.url });
}

export async function DELETE() {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const existing = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { profileImageStorageKey: true },
  });
  await prisma.user.update({
    where: { id: session.sub },
    data: { profileImageUrl: null, profileImageStorageKey: null },
  });
  if (existing?.profileImageStorageKey) {
    await deleteFile(existing.profileImageStorageKey).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
