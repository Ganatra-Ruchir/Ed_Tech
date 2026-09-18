import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { addAnnouncementComment } from "@/lib/announcements";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text || text.length > 2000) return NextResponse.json({ error: "Comment is required (max 2000 chars)" }, { status: 400 });

  const announcement = await prisma.announcement.findUnique({ where: { id }, select: { batchId: true, allowComments: true } });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!announcement.allowComments) return NextResponse.json({ error: "Comments are disabled for this announcement" }, { status: 403 });
  if (!(await canAccessBatch(session, announcement.batchId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await addAnnouncementComment(id, session.sub, text);
  return NextResponse.json({ ok: true }, { status: 201 });
}
