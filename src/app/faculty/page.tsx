import Link from "next/link";
import { Inbox, ClipboardCheck, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyReviewQueue({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const session = await getSession();
  const { batch: batchFilter } = await searchParams;

  const myBatches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    orderBy: { name: "asc" },
  });

  const batchIds = batchFilter ? [batchFilter] : myBatches.map((b) => b.id);

  const [pendingSubmissions, ungradedResponses] = await Promise.all([
    prisma.submission.findMany({
      where: { batchId: { in: batchIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      include: { student: { select: { name: true } }, batch: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.testResponse.findMany({
      where: {
        test: { batchId: { in: batchIds } },
        answers: { some: { question: { type: "SHORT_ANSWER" }, isCorrect: null } },
      },
      include: {
        student: { select: { name: true } },
        test: { select: { title: true, batch: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Review Queue</h1>
          <p className="text-sm text-slate-500">
            Pending submissions and test responses across your batches.
          </p>
        </div>
        <BatchFilterSelect batches={myBatches} value={batchFilter ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Inbox size={18} />
          </span>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{pendingSubmissions.length}</p>
            <p className="text-xs font-medium text-slate-500">Submissions awaiting review</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <ClipboardCheck size={18} />
          </span>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{ungradedResponses.length}</p>
            <p className="text-xs font-medium text-slate-500">Test responses needing grading</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Submissions awaiting review</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {pendingSubmissions.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Nothing pending. Nice work.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingSubmissions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={s.student.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{s.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {s.student.name} · {s.batch.name} · {fmtDate(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={s.status} />
                    <Link
                      href={`/faculty/submissions/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                      Review <ArrowRight size={12} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Test responses needing grading</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {ungradedResponses.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">All short-answer responses graded.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ungradedResponses.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.student.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{r.test.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {r.student.name} · {r.test.batch.name} · {fmtDate(r.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/faculty/test-responses/${r.id}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    Grade <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
