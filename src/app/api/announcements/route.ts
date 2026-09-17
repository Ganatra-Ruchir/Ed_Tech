import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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

const bodySchema = z.object({
  batchId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid announcement" }, { status: 400 });

  const allowed = await canAccessBatch(session, parsed.data.batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcement = await prisma.announcement.create({
    data: {
      batchId: parsed.data.batchId,
      facultyId: session.sub,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  await logAudit({
    actorId: session.sub,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { batchId: parsed.data.batchId },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
