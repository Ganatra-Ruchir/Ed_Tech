import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/auth";
import type { AnnouncementDTO } from "@/lib/announcement-types";

/**
 * The ONLY module that reads the announcement receipt/comment models. Keeping
 * every new-model query here means the rest of the app types against
 * AnnouncementDTO and compiles without waiting on `prisma generate`.
 *
 * `viewerId` is whose acknowledgement state to report. When a student loads
 * the stream we also record a "seen" receipt (upsert, so it's idempotent).
 */
async function batchScope(session: SessionPayload): Promise<string[]> {
  if (session.role === "ADMIN") return (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id);
  if (session.role === "FACULTY" && session.isCC)
    return (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id);
  return userBatchIds(session.sub);
}

export async function listAnnouncements(session: SessionPayload, recordSeen: boolean): Promise<AnnouncementDTO[]> {
  const batchIds = await batchScope(session);
  if (batchIds.length === 0) return [];

  const announcements = await prisma.announcement.findMany({
    where: { batchId: { in: batchIds } },
    include: {
      faculty: { select: { name: true, profileImageUrl: true } },
      batch: { select: { name: true } },
      receipts: { select: { userId: true, seenAt: true, acknowledgedAt: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, profileImageUrl: true } } },
      },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  // Audience size = student members of each announcement's batch.
  const counts = await prisma.userBatch.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds }, user: { role: "STUDENT" } },
    _count: { userId: true },
  });
  const audienceByBatch = new Map(counts.map((c) => [c.batchId, c._count.userId]));

  // Record that this student has now seen everything in their stream.
  if (recordSeen && session.role === "STUDENT") {
    await Promise.all(
      announcements
        .filter((a) => !a.receipts.some((r) => r.userId === session.sub))
        .map((a) =>
          prisma.announcementReceipt
            .upsert({
              where: { announcementId_userId: { announcementId: a.id, userId: session.sub } },
              create: { announcementId: a.id, userId: session.sub },
              update: {},
            })
            .catch(() => null),
        ),
    );
  }

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    category: a.category,
    pinned: a.pinned,
    requireAck: a.requireAck,
    allowComments: a.allowComments,
    bannerUrl: a.bannerUrl,
    backgroundTheme: a.backgroundTheme,
    batchId: a.batchId,
    batchName: a.batch.name,
    facultyName: a.faculty.name,
    facultyImageUrl: a.faculty.profileImageUrl,
    createdAt: a.createdAt.toISOString(),
    attachment: a.attachmentUrl
      ? {
          url: a.attachmentUrl,
          name: a.attachmentName ?? "attachment",
          type: a.attachmentType ?? "application/octet-stream",
          size: a.attachmentSize ?? 0,
        }
      : null,
    audienceCount: audienceByBatch.get(a.batchId) ?? 0,
    seenCount: a.receipts.length,
    acknowledgedCount: a.receipts.filter((r) => r.acknowledgedAt !== null).length,
    viewerAcknowledged: a.receipts.some((r) => r.userId === session.sub && r.acknowledgedAt !== null),
    comments: a.comments.map((c) => ({
      id: c.id,
      authorName: c.author.name,
      authorImageUrl: c.author.profileImageUrl,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  }));
}

export async function acknowledgeAnnouncement(announcementId: string, userId: string): Promise<void> {
  await prisma.announcementReceipt.upsert({
    where: { announcementId_userId: { announcementId, userId } },
    create: { announcementId, userId, acknowledgedAt: new Date() },
    update: { acknowledgedAt: new Date() },
  });
}

export async function addAnnouncementComment(announcementId: string, authorId: string, body: string): Promise<void> {
  await prisma.announcementComment.create({ data: { announcementId, authorId, body } });
}
