import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { CALENDAR_CATEGORIES, isValidDateKey, isValidTime } from "@/lib/calendar";

export async function GET() {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;

  const events = await prisma.calendarEvent.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    events: events.map((event) => ({ ...event, createdByName: event.createdBy.name })),
  });
}

const eventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  eventDate: z.string().refine(isValidDateKey, "Invalid event date"),
  startTime: z.string().refine(isValidTime, "Invalid start time").optional(),
  endTime: z.string().refine(isValidTime, "Invalid end time").optional(),
  location: z.string().trim().max(160).optional(),
  category: z.enum(CALENDAR_CATEGORIES.map((category) => category.value)),
});

export async function POST(request: Request) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const raw = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid event" }, { status: 400 });
  }
  const data = parsed.data;
  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description || null,
      eventDate: data.eventDate,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      location: data.location || null,
      category: data.category,
      createdById: session.sub,
    },
    include: { createdBy: { select: { name: true } } },
  });

  await logAudit({
    actorId: session.sub,
    action: "calendar_event.create",
    entityType: "CalendarEvent",
    entityId: event.id,
    metadata: { eventDate: event.eventDate },
  });

  return NextResponse.json({ event: { ...event, createdByName: event.createdBy.name } }, { status: 201 });
}
