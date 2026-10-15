import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { isLiveClassHost, loadAccessibleClass, syncRoomSettings, toLiveClassDTO } from "@/lib/live/classes";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ liveClass: toLiveClassDTO(liveClass), isHost });
}

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(10).max(600),
    waitingRoom: z.boolean(),
    muteOnEntry: z.boolean(),
    allowStudentUnmute: z.boolean(),
    allowStudentVideo: z.boolean(),
    allowStudentScreenShare: z.boolean(),
    allowChat: z.boolean(),
    captionsEnabled: z.boolean(),
    autoRecord: z.boolean(),
    status: z.literal("CANCELLED"),
  })
  .partial();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const existing = await prisma.liveClass.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLiveClassHost(guard.session, existing)) return NextResponse.json({ error: "Only the host can change this class." }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid changes" }, { status: 400 });
  if (parsed.data.status === "CANCELLED" && existing.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Only scheduled classes can be cancelled." }, { status: 400 });
  }
  const { scheduledAt, ...rest } = parsed.data;
  const updated = await prisma.liveClass.update({
    where: { id },
    data: { ...rest, ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}) },
    include: { batch: { select: { name: true } }, host: { select: { name: true } } },
  });
  await syncRoomSettings(updated);
  await logAudit({ actorId: guard.session.sub, action: "LIVE_CLASS_UPDATED", entityType: "LiveClass", entityId: id, metadata: parsed.data });
  return NextResponse.json({ liveClass: toLiveClassDTO(updated) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const existing = await prisma.liveClass.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLiveClassHost(guard.session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (existing.status === "LIVE") return NextResponse.json({ error: "End the class before deleting it." }, { status: 400 });
  await prisma.liveClass.delete({ where: { id } });
  await logAudit({ actorId: guard.session.sub, action: "LIVE_CLASS_DELETED", entityType: "LiveClass", entityId: id });
  return NextResponse.json({ ok: true });
}
