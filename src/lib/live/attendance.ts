import { prisma } from "@/lib/prisma";
import type { LiveClass } from "@/generated/prisma/client";

/** One row per student in the batch, including those who never joined. */
export async function liveAttendanceRows(liveClass: LiveClass) {
  const [members, seats] = await Promise.all([
    prisma.userBatch.findMany({
      where: { batchId: liveClass.batchId, user: { role: "STUDENT" } },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.liveClassParticipant.findMany({ where: { liveClassId: liveClass.id } }),
  ]);
  const seatByUser = new Map(seats.map((s) => [s.userId, s]));
  const plannedSeconds =
    liveClass.startedAt && liveClass.endedAt
      ? Math.max(60, (liveClass.endedAt.getTime() - liveClass.startedAt.getTime()) / 1000)
      : liveClass.durationMinutes * 60;
  const now = Date.now();

  return members.map(({ user }) => {
    const seat = seatByUser.get(user.id);
    const openSeconds = seat?.sessionStartedAt ? (now - seat.sessionStartedAt.getTime()) / 1000 : 0;
    const seconds = (seat?.totalSeconds ?? 0) + openSeconds;
    const percent = Math.min(100, Math.round((seconds / plannedSeconds) * 100));
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      status: !seat?.firstJoinedAt ? "Absent" : seat.sessionStartedAt ? "In class now" : "Attended",
      minutes: Math.round(seconds / 60),
      percent,
      firstJoinedAt: seat?.firstJoinedAt?.toISOString() ?? null,
      lastLeftAt: seat?.lastLeftAt?.toISOString() ?? null,
      joinCount: seat?.joinCount ?? 0,
    };
  });
}
