import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { liveFeatureStatus, toLiveClassDTO } from "./classes";

/** Classes for the list pages, scoped like the API. */
export async function listLiveClassesFor(session: SessionPayload) {
  const seesAll = session.role === "ADMIN" || (session.role === "FACULTY" && session.isCC);
  const scope = seesAll ? {} : { batch: { members: { some: { userId: session.sub } } } };
  const [classes, batches] = await Promise.all([
    prisma.liveClass.findMany({
      where: scope,
      include: {
        batch: { select: { name: true } },
        host: { select: { name: true } },
        _count: { select: { recordings: true, participants: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 300,
    }),
    session.role === "STUDENT"
      ? Promise.resolve([])
      : prisma.batch.findMany({
          where: seesAll ? {} : { members: { some: { userId: session.sub } } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
  ]);
  const recordings = await prisma.liveClassRecording.findMany({
    where: { liveClassId: { in: classes.map((c) => c.id) }, status: "READY", fileUrl: { not: null } },
    select: { liveClassId: true, fileUrl: true, durationSeconds: true },
  });
  return {
    classes: classes.map((c) => ({
      ...toLiveClassDTO(c),
      recordings: recordings.filter((r) => r.liveClassId === c.id).map((r) => ({ url: r.fileUrl!, durationSeconds: r.durationSeconds })),
    })),
    batches,
    feature: liveFeatureStatus(),
  };
}
export type LiveClassListItem = Awaited<ReturnType<typeof listLiveClassesFor>>["classes"][number];
