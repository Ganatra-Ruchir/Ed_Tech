import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyTestsPage() {
  const session = await getSession();

  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const tests = await prisma.test.findMany({
    where: { batchId: { in: batchIds } },
    include: {
      batch: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { questions: true, responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Tests</h1>
        <Link
          href="/faculty/tests/new"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New test
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {tests.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No tests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Questions</th>
                <th className="px-4 py-2">Responses</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{t.title}</td>
                  <td className="px-4 py-2 text-slate-500">{t.batch.name}</td>
                  <td className="px-4 py-2 text-slate-500">{t._count.questions}</td>
                  <td className="px-4 py-2 text-slate-500">{t._count.responses}</td>
                  <td className="px-4 py-2">
                    {t.publishedAt ? (
                      <span className="text-emerald-700">Published</span>
                    ) : (
                      <span className="text-slate-500">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{fmtDate(t.dueAt)}</td>
                  <td className="px-4 py-2">
                    <Link href={`/faculty/tests/${t.id}`} className="text-indigo-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
