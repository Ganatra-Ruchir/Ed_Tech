import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { listAnnouncements } from "@/lib/announcements";
import { PageHeader } from "@/components/PageHeader";
import { AnnouncementComposer } from "./AnnouncementComposer";
import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";

export default async function FacultyAnnouncementsPage() {
  const session = await getSession();

  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const [batches, announcements] = await Promise.all([
    prisma.batch.findMany({ where: { id: { in: batchIds } }, orderBy: { name: "asc" } }),
    listAnnouncements(session!, false),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Announcements"
        description="Post updates to your class stream. Pin important notices, require acknowledgment, and see who has read and acknowledged each post."
      />
      <AnnouncementComposer batches={batches.map((b) => ({ id: b.id, name: b.name }))} />
      <AnnouncementFeed announcements={announcements} canSeeInsights />
    </div>
  );
}
