import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-500">
          Post updates to your batch&apos;s class stream — students see these on their dashboard.
        </p>
      </div>

      <AnnouncementComposer batches={batches.map((b) => ({ id: b.id, name: b.name }))} />

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No announcements posted yet.
          </p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {a.batch.name}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
              <p className="mt-2 text-xs text-slate-400">
                {a.faculty.name} · {fmtDateTime(a.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
