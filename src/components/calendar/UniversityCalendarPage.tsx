import { prisma } from "@/lib/prisma";
import { UniversityCalendar } from "./UniversityCalendar";

export async function UniversityCalendarPage({ canManage }: { canManage: boolean }) {
  const events = await prisma.calendarEvent.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
  });

  return (
    <UniversityCalendar
      canManage={canManage}
      initialEvents={events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        category: event.category,
        createdByName: event.createdBy.name,
        createdAt: event.createdAt.toISOString(),
      }))}
    />
  );
}
