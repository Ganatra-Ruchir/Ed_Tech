import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { acknowledgeAnnouncement } from "@/lib/announcements";
import { logAudit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const announcement = await prisma.announcement.findUnique({ where: { id }, select: { batchId: true } });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessBatch(session, announcement.batchId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await acknowledgeAnnouncement(id, session.sub);
  await logAudit({ actorId: session.sub, action: "announcement.acknowledge", entityType: "Announcement", entityId: id });
  return NextResponse.json({ ok: true });
}
