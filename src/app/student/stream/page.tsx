import { Megaphone } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";

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
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Class Stream</h1>
        <p className="text-sm text-slate-500">Announcements and updates from your faculty.</p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <Megaphone className="text-slate-300" size={28} />
          <p className="text-sm text-slate-500">No announcements yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={a.faculty.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-400">
                    {a.faculty.name} · {fmtDateTime(a.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
