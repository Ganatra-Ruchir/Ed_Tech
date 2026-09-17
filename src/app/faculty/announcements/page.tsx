import { Megaphone } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { AnnouncementComposer } from "./AnnouncementComposer";

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function FacultyAnnouncementsPage() {
  const session = await getSession();

  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const [batches, announcements] = await Promise.all([
    prisma.batch.findMany({ where: { id: { in: batchIds } }, orderBy: { name: "asc" } }),
    prisma.announcement.findMany({
      where: { batchId: { in: batchIds } },
      include: { faculty: { select: { name: true } }, batch: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Announcements"
        description="Post updates to your batch's class stream — students see these on their dashboard."
      />

      <AnnouncementComposer batches={batches.map((b) => ({ id: b.id, name: b.name }))} />

      <div className="space-y-2.5">
        {announcements.length === 0 ? (
          <Card>
            <EmptyState icon={Megaphone} title="No announcements posted yet" />
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-zinc-900">{a.title}</p>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  {a.batch.name}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-700">{a.body}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {a.faculty.name} · {fmtDateTime(a.createdAt)}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
