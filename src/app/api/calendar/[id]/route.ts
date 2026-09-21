import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await prisma.calendarEvent.delete({ where: { id } });
  await logAudit({
    actorId: session.sub,
    action: "calendar_event.delete",
    entityType: "CalendarEvent",
    entityId: id,
    metadata: { title: event.title, eventDate: event.eventDate },
  });

  return NextResponse.json({ ok: true });
}
