import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { loadAccessibleClass } from "@/lib/live/classes";

/** Host view of seats: waiting room queue and breakout assignments. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass || !isHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const seats = await prisma.liveClassParticipant.findMany({
    where: { liveClassId: id },
    select: { userId: true, status: true, breakoutRoom: true, requestedAt: true, user: { select: { name: true } } },
    orderBy: { requestedAt: "asc" },
  });
  return NextResponse.json({
    waiting: seats.filter((s) => s.status === "WAITING").map((s) => ({ userId: s.userId, name: s.user.name, since: s.requestedAt })),
    assignments: Object.fromEntries(seats.filter((s) => s.breakoutRoom).map((s) => [s.userId, s.breakoutRoom])),
  });
}
