import Link from "next/link";
import {
  FileText,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Megaphone,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { userBatchIds } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(d: Date, now: number): number {
  return Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
}

export default async function StudentDashboard() {
  const session = await getSession();
  const studentId = session!.sub;
  const batchIds = await userBatchIds(studentId);

  const [submissions, tests, kpis, announcements] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId },
      include: { files: true, _count: { select: { feedback: true, evidence: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.test.findMany({
      where: {
        publishedAt: { not: null },
        batch: { members: { some: { userId: studentId } } },
      },
      include: { _count: { select: { questions: true } } },
      orderBy: { dueAt: "asc" },
    }),
    getLatestKpis({ scope: "STUDENT", studentId }),
    prisma.announcement.findMany({
      where: { batchId: { in: batchIds } },
      include: { faculty: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  const myResponses = await prisma.testResponse.findMany({
    where: { studentId, testId: { in: tests.map((t) => t.id) } },
  });
  const responseByTest = new Map(myResponses.map((r) => [r.testId, r]));

  const kpiByName = Object.fromEntries(kpis.map((k) => [k.metricName, k.value]));
  // This page is already fully dynamic (reads the session cookie), so
  // capturing the current time for a due-date comparison is safe here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  type UpcomingItem = {
    key: string;
    label: string;
    href: string;
    dueAt: Date | null;
    kind: "test" | "revision";
  };
  const upcoming: UpcomingItem[] = [
    ...tests
      .filter((t) => !responseByTest.has(t.id))
      .map((t) => ({
        key: `test-${t.id}`,
        label: t.title,
        href: `/student/tests/${t.id}`,
        dueAt: t.dueAt,
        kind: "test" as const,
      })),
    ...submissions
      .filter((s) => s.status === "NEEDS_REVISION")
      .map((s) => ({
        key: `revision-${s.id}`,
        label: s.title,
        href: `/student/submissions/${s.id}`,
        dueAt: null,
        kind: "revision" as const,
      })),
  ].sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));

  const completionRate = kpiByName["submission_completion_rate"] ?? 0;
  const avgScore = kpiByName["avg_test_score_pct"] ?? 0;

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Welcome back, {session!.name.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500">Here&apos;s where your project work and tests stand.</p>
        </div>
        <Link
          href="/student/submissions/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <Plus size={16} /> New submission
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Submission completion"
          value={`${completionRate.toFixed(0)}%`}
          icon={CheckCircle2}
          progress={completionRate}
        />
        <KpiCard label="Avg test score" value={`${avgScore.toFixed(0)}%`} icon={TrendingUp} progress={avgScore} />
        <KpiCard label="Total submissions" value={String(submissions.length)} icon={FileText} />
        <KpiCard label="Tests assigned" value={String(tests.length)} icon={ClipboardList} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Clock size={16} className="text-indigo-600" /> Upcoming
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {upcoming.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Nothing due right now — you&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((item) => {
                  const overdue = item.dueAt && item.dueAt.getTime() < now;
                  return (
                    <li key={item.key} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.kind === "revision" ? (
                          <AlertCircle size={16} className="shrink-0 text-rose-500" />
                        ) : (
                          <ClipboardList size={16} className="shrink-0 text-amber-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.label}</p>
                          <p className="text-xs text-slate-400">
                            {item.kind === "revision"
                              ? "Needs revision — review feedback"
                              : item.dueAt
                                ? overdue
                                  ? `Past due (${fmtDate(item.dueAt)})`
                                  : `Due ${fmtDate(item.dueAt)} · ${daysUntil(item.dueAt, now)}d left`
                                : "No due date"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={item.href}
                        className="shrink-0 text-xs font-medium text-indigo-600 hover:underline"
                      >
                        {item.kind === "revision" ? "View" : "Fill in"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Megaphone size={16} className="text-indigo-600" /> Class Stream
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {announcements.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No announcements yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {announcements.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{a.faculty.name}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/student/stream"
              className="flex items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs font-medium text-indigo-600 hover:bg-slate-50"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">My Submissions</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {submissions.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No submissions yet. Create your first one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/student/submissions/${s.id}`} className="font-medium text-slate-900 hover:underline">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-2 text-slate-500">{fmtDate(s.createdAt)}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {s._count.feedback > 0 ? `${s._count.feedback} comment(s)` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Assigned Tests</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {tests.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No tests assigned yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2">Questions</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => {
                  const response = responseByTest.get(t.id);
                  const overdue = t.dueAt && t.dueAt.getTime() < now && !response;
                  return (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{t.title}</td>
                      <td className="px-4 py-2 text-slate-500">{fmtDate(t.dueAt)}</td>
                      <td className="px-4 py-2 text-slate-500">{t._count.questions}</td>
                      <td className="px-4 py-2">
                        {response ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={14} /> {response.score ?? "-"}/{response.maxScore ?? "-"}
                          </span>
                        ) : overdue ? (
                          <span className="text-rose-600">Past due</span>
                        ) : (
                          <Link
                            href={`/student/tests/${t.id}`}
                            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                          >
                            Fill in
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
