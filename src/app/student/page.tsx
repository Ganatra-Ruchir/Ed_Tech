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
  Inbox,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { userBatchIds } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td } from "@/components/Table";

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
    <div className="space-y-7">
      <PageHeader
        title={`Welcome back, ${session!.name.split(" ")[0]}`}
        description="Here's where your project work and tests stand."
        actions={
          <LinkButton href="/student/submissions/new" size="sm">
            <Plus size={14} /> New submission
          </LinkButton>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Completion"
          value={`${completionRate.toFixed(0)}%`}
          icon={CheckCircle2}
          progress={completionRate}
        />
        <KpiCard label="Avg test score" value={`${avgScore.toFixed(0)}%`} icon={TrendingUp} progress={avgScore} />
        <KpiCard label="Submissions" value={String(submissions.length)} icon={FileText} />
        <KpiCard label="Tests assigned" value={String(tests.length)} icon={ClipboardList} />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
            <Clock size={14} className="text-zinc-400" /> Upcoming
          </h2>
          <Card>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing due right now"
                description="You're all caught up."
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {upcoming.map((item) => {
                  const overdue = item.dueAt && item.dueAt.getTime() < now;
                  return (
                    <li key={item.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {item.kind === "revision" ? (
                          <AlertCircle size={15} className="shrink-0 text-rose-500" />
                        ) : (
                          <ClipboardList size={15} className="shrink-0 text-amber-500" />
                        )}
                        <div>
                          <p className="text-[13px] font-medium text-zinc-900">{item.label}</p>
                          <p className="text-xs text-zinc-400">
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
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
            <Megaphone size={14} className="text-zinc-400" /> Class Stream
          </h2>
          <Card>
            {announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements yet" />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {announcements.map((a) => (
                  <li key={a.id} className="px-4 py-2.5">
                    <p className="text-[13px] font-medium text-zinc-900">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{a.body}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{a.faculty.name}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/student/stream"
              className="flex items-center justify-center gap-1 border-t border-zinc-100 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            >
              View all <ArrowRight size={12} />
            </Link>
          </Card>
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">My Submissions</h2>
        <Card className="overflow-hidden">
          {submissions.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No submissions yet"
              description="Create your first one to get started."
            />
          ) : (
            <Table>
              <THead>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                <Th>Feedback</Th>
              </THead>
              <tbody>
                {submissions.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/student/submissions/${s.id}`} className="font-medium text-zinc-900 hover:underline">
                        {s.title}
                      </Link>
                    </Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="text-zinc-500">{fmtDate(s.createdAt)}</Td>
                    <Td className="text-zinc-500">
                      {s._count.feedback > 0 ? `${s._count.feedback} comment(s)` : "-"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Assigned Tests</h2>
        <Card className="overflow-hidden">
          {tests.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No tests assigned yet" />
          ) : (
            <Table>
              <THead>
                <Th>Title</Th>
                <Th>Due</Th>
                <Th>Questions</Th>
                <Th>Status</Th>
              </THead>
              <tbody>
                {tests.map((t) => {
                  const response = responseByTest.get(t.id);
                  const overdue = t.dueAt && t.dueAt.getTime() < now && !response;
                  return (
                    <Tr key={t.id}>
                      <Td className="font-medium text-zinc-900">{t.title}</Td>
                      <Td className="text-zinc-500">{fmtDate(t.dueAt)}</Td>
                      <Td className="text-zinc-500">{t._count.questions}</Td>
                      <Td>
                        {response ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={14} /> {response.score ?? "-"}/{response.maxScore ?? "-"}
                          </span>
                        ) : overdue ? (
                          <span className="text-rose-600">Past due</span>
                        ) : (
                          <LinkButton href={`/student/tests/${t.id}`} size="sm">
                            Fill in
                          </LinkButton>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
