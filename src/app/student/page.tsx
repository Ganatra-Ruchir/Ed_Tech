import Link from "next/link";
import {
  FileText,
  ClipboardList,
  CheckCircle2,
  BarChart3,
  Target,
  Megaphone,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Inbox,
  MoreVertical,
  Quote,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { userBatchIds } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(d: Date, now: number): number {
  return Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
}

const QUOTES = [
  "A little progress each day adds up to big results.",
  "Consistency beats intensity — keep showing up.",
  "Small wins compound into big outcomes.",
  "Progress, not perfection.",
];

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
  // eslint-disable-next-line react-hooks/purity
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

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
  ]
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
    .slice(0, 4);

  const completionRate = kpiByName["submission_completion_rate"] ?? 0;
  const avgScore = kpiByName["avg_test_score_pct"] ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Welcome back, {session!.name.split(" ")[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Here&apos;s where your project work and tests stand. Keep going!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden max-w-xs items-start gap-2 border-l-2 border-[#6b1029]/40 pl-3 sm:flex">
            <Quote size={14} className="mt-0.5 shrink-0 text-[#6b1029]/50" />
            <p className="text-xs italic text-zinc-500">&ldquo;{quote}&rdquo;</p>
          </div>
          <LinkButton
            href="/student/submissions/new"
            size="sm"
            className="!bg-[#6b1029] hover:!bg-[#7c1638]"
          >
            <Plus size={14} /> New Submission
          </LinkButton>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-rose-50/70 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <Target size={16} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Completion</p>
              <p className="text-xl font-bold text-zinc-900">{completionRate.toFixed(0)}%</p>
            </div>
          </div>
          <ProgressBar value={completionRate} tone="danger" className="mt-3 !bg-rose-200/70 [&>div]:!bg-rose-500" />
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {completionRate >= 75 ? "Great progress! Keep it up." : completionRate >= 40 ? "Good progress! Keep it up." : "Let's pick up the pace."}
          </p>
        </div>

        <div className="rounded-lg bg-amber-50/70 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <BarChart3 size={16} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Avg Test Score</p>
              <p className="text-xl font-bold text-zinc-900">{avgScore.toFixed(0)}%</p>
            </div>
          </div>
          <ProgressBar value={avgScore} tone="warning" className="mt-3 !bg-amber-200/70" />
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {avgScore >= 60 ? "Above average performance." : "Room to grow — keep practicing."}
          </p>
        </div>

        <div className="rounded-lg bg-violet-50/70 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FileText size={16} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Submissions</p>
              <p className="text-xl font-bold text-zinc-900">{submissions.length}</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-zinc-500">Out of your current work</p>
        </div>

        <div className="rounded-lg bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <ClipboardList size={16} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Tests Assigned</p>
              <p className="text-xl font-bold text-zinc-900">{tests.length}</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-zinc-500">Pending or in progress</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <Clock size={14} className="text-[#6b1029]" /> Upcoming
            </h2>
            <Link href="/student/tests" className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <Card>
            {upcoming.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing due right now" description="You're all caught up." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {upcoming.map((item) => {
                  const overdue = item.dueAt && item.dueAt.getTime() < now;
                  const dueSoon = item.dueAt && !overdue && daysUntil(item.dueAt, now) <= 5;
                  return (
                    <li key={item.key} className="flex items-center gap-3 px-3.5 py-3">
                      {item.dueAt ? (
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-rose-50 py-1.5 text-rose-700">
                          <span className="text-[9px] font-semibold uppercase tracking-wide">
                            {new Date(item.dueAt).toLocaleDateString("en-IN", { month: "short" })}
                          </span>
                          <span className="text-[15px] font-bold leading-none">{new Date(item.dueAt).getDate()}</span>
                        </div>
                      ) : (
                        <span className="flex h-11 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
                          <AlertCircle size={16} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-zinc-900">{item.label}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                          {item.kind === "revision" ? (
                            <span className="rounded-full bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700">Feedback Pending</span>
                          ) : dueSoon || overdue ? (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                              {overdue ? "Past Due" : "Due Soon"}
                            </span>
                          ) : null}
                          {item.kind === "revision" ? "Awaiting your revision" : item.dueAt ? `Due in ${daysUntil(item.dueAt, now)} days` : "No due date"}
                        </p>
                      </div>
                      <Link href={item.href} className="shrink-0 text-zinc-300 hover:text-zinc-600">
                        <ArrowRight size={15} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <Megaphone size={14} className="text-[#6b1029]" /> Class Stream
            </h2>
            <Link href="/student/stream" className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <Card>
            {announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements yet" />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {announcements.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-3.5 py-3">
                    <Avatar name={a.faculty.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-zinc-900">{a.title}</p>
                      <p className="text-[11px] text-zinc-400">
                        {a.faculty.name} · {fmtDate(a.createdAt)}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600">{a.body}</p>
                    </div>
                    <MoreVertical size={14} className="mt-0.5 shrink-0 text-zinc-300" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-zinc-900">My Submissions</h2>
          <Link href="/student/submissions" className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <Card className="overflow-hidden">
          {submissions.length === 0 ? (
            <EmptyState icon={Inbox} title="No submissions yet" description="Create your first one to get started." />
          ) : (
            <Table>
              <THead>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Submitted On</Th>
                <Th>Feedback</Th>
                <Th></Th>
              </THead>
              <TBody>
                {submissions.slice(0, 4).map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/student/submissions/${s.id}`} className="font-medium text-zinc-900 hover:underline">
                        {s.title}
                      </Link>
                    </Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="text-zinc-500">{fmtDate(s.createdAt)}</Td>
                    <Td className="text-zinc-500">{s._count.feedback > 0 ? `${s._count.feedback} comment(s)` : "-"}</Td>
                    <Td>
                      <MoreVertical size={14} className="text-zinc-300" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-zinc-900">Assigned Tests</h2>
          <Link href="/student/tests" className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <Card className="overflow-hidden">
          {tests.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No tests assigned yet" />
          ) : (
            <Table>
              <THead>
                <Th>Title</Th>
                <Th>Due Date</Th>
                <Th>Questions</Th>
                <Th>Status</Th>
                <Th>Score</Th>
                <Th></Th>
              </THead>
              <TBody>
                {tests.slice(0, 4).map((t) => {
                  const response = responseByTest.get(t.id);
                  const overdue = t.dueAt && t.dueAt.getTime() < now && !response;
                  return (
                    <Tr key={t.id}>
                      <Td className="font-medium text-zinc-900">{t.title}</Td>
                      <Td className="text-zinc-500">{fmtDate(t.dueAt)}</Td>
                      <Td className="text-zinc-500">{t._count.questions}</Td>
                      <Td>
                        {response ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">Past due</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Upcoming</span>
                        )}
                      </Td>
                      <Td className="text-zinc-500">{response ? `${response.score ?? "-"} / ${response.maxScore ?? "-"}` : "-"}</Td>
                      <Td>
                        {response ? (
                          <Link href={`/student/tests/${t.id}`} className="text-xs font-medium text-[#6b1029] hover:underline">
                            View
                          </Link>
                        ) : overdue ? (
                          <span className="text-xs text-zinc-300">-</span>
                        ) : (
                          <LinkButton href={`/student/tests/${t.id}`} size="sm" className="!bg-[#6b1029] hover:!bg-[#7c1638]">
                            Continue <ArrowRight size={12} />
                          </LinkButton>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
