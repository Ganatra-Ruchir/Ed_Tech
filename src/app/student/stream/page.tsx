import { Megaphone } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function StudentStreamPage() {
  const session = await getSession();
  const batchIds = await userBatchIds(session!.sub);

  const announcements = await prisma.announcement.findMany({
    where: { batchId: { in: batchIds } },
    include: { faculty: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Class Stream" description="Announcements and updates from your faculty." />

      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="No announcements yet" description="Check back soon." />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={a.faculty.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-zinc-900">{a.title}</p>
                  <p className="text-xs text-zinc-400">
                    {a.faculty.name} · {fmtDateTime(a.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{a.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
