import Link from "next/link";
import Image from "next/image";
import {
  ClipboardList,
  CheckCircle2,
  BarChart3,
  Megaphone,
  Clock,
  AlertCircle,
  ArrowRight,
  Inbox,
  Quote,
  LibraryBig,
  BookOpen,
  ChevronRight,
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
  return Math.round((d.getTime() - now) / (1000 * 60 * 60 * 24));
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

  const [submissions, tests, kpis, announcements, materialCount, studentBatches] = await Promise.all([
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
    prisma.learningMaterial.count({ where: { batchId: { in: batchIds } } }),
    prisma.batch.findMany({
      where: { id: { in: batchIds } },
      select: {
        id: true,
        name: true,
        department: true,
        semester: true,
        _count: { select: { learningMaterials: true, tests: true } },
      },
      orderBy: { name: "asc" },
      take: 6,
    }),
  ]);

  const myResponses = await prisma.testResponse.findMany({
    where: { studentId, testId: { in: tests.map((t) => t.id) } },
  });
  const responseByTest = new Map(myResponses.map((r) => [r.testId, r]));

  const kpiByName = Object.fromEntries(kpis.map((k) => [k.metricName, k.value]));
  // This page is already fully dynamic (reads the session cookie), so
  // capturing the current time for a due-date comparison is safe here.
  const now = new Date().getTime();
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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-[#eaded9] px-5 py-7 sm:px-7">
        <Image src="/campus-airplane.png" alt="Silver Oak University campus" fill priority className="object-cover object-center opacity-55" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,245,0.98)_0%,rgba(255,248,245,0.86)_48%,rgba(255,248,245,0.24)_100%)]" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-[28px]">
            Welcome back, {session!.name.split(" ")[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Keep going! You&apos;re one step closer to your goals.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden max-w-xs items-start gap-2 border-l-2 border-[#ef5b3f]/40 pl-3 sm:flex">
            <Quote size={14} className="mt-0.5 shrink-0 text-[#ef5b3f]/50" />
            <p className="text-xs italic text-zinc-500">&ldquo;{quote}&rdquo;</p>
          </div>
        </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link href="/student/materials" className="group rounded-lg border border-[#e4e7e0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-[#8f3032]"><BookOpen size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-500">My Courses</p>
              <p className="text-xl font-bold text-zinc-900">{batchIds.length}</p>
            </div>
            <ChevronRight size={16} className="text-zinc-300 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Active this semester</p>
        </Link>

        <Link href="/student/submissions" className="group rounded-lg border border-[#e4e7e0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600"><ClipboardList size={18} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-medium text-zinc-500">Pending Work</p><p className="text-xl font-bold text-zinc-900">{upcoming.length}</p></div>
            <ChevronRight size={16} className="text-zinc-300 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Due soon or needs revision</p>
        </Link>

        <Link href="/student/reports" className="group rounded-lg border border-[#e4e7e0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><BarChart3 size={18} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-medium text-zinc-500">Overall Progress</p><p className="text-xl font-bold text-zinc-900">{completionRate.toFixed(0)}%</p></div>
            <ChevronRight size={16} className="text-zinc-300 transition-transform group-hover:translate-x-0.5" />
          </div>
          <ProgressBar value={completionRate} tone="brand" className="mt-3" />
        </Link>

        <Link href="/student/tests" className="group rounded-lg border border-[#e4e7e0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600"><ClipboardList size={18} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-medium text-zinc-500">Upcoming Tests</p><p className="text-xl font-bold text-zinc-900">{tests.filter((test) => !responseByTest.has(test.id)).length}</p></div>
            <ChevronRight size={16} className="text-zinc-300 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">{materialCount} materials available</p>
        </Link>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">My Courses</h2>
            <p className="text-xs text-zinc-500">Your active classes and learning resources.</p>
          </div>
          <Link href="/student/materials" className="flex items-center gap-1 text-xs font-medium text-[#8f3032] hover:underline">
            View materials <ArrowRight size={11} />
          </Link>
        </div>
        {studentBatches.length === 0 ? (
          <Card><EmptyState icon={BookOpen} title="No courses assigned" description="Your enrolled courses will appear here." /></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {studentBatches.map((batch, index) => {
              const tones = [
                "bg-emerald-50 text-emerald-700",
                "bg-violet-50 text-violet-700",
                "bg-sky-50 text-sky-700",
              ];
              return (
                <Link
                  key={batch.id}
                  href="/student/materials"
                  className="group rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8f3032]/20 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[index % tones.length]}`}>
                      <LibraryBig size={18} />
                    </span>
                    <ChevronRight size={16} className="text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Semester {batch.semester}</p>
                  <h3 className="mt-1 text-sm font-semibold text-zinc-900">{batch.name}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">{batch.department}</p>
                  <div className="mt-3 flex gap-3 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-500">
                    <span>{batch._count.learningMaterials} materials</span>
                    <span>{batch._count.tests} tests</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <Clock size={14} className="text-[#ef5b3f]" /> Upcoming
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
                  const daysRemaining = item.dueAt ? daysUntil(item.dueAt, now) : null;
                  const overdue = daysRemaining !== null && daysRemaining < 0;
                  const dueSoon = daysRemaining !== null && !overdue && daysRemaining <= 5;
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
                          {item.kind === "revision" ? "Awaiting your revision" : item.dueAt ? (
                            overdue ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"}` : daysRemaining === 0 ? "Due today" : `Due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
                          ) : "No due date"}
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
              <Megaphone size={14} className="text-[#ef5b3f]" /> Class Stream
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
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>

      <Link href="/student/materials" className="group relative block overflow-hidden rounded-lg border border-[#e5e0d7] bg-[linear-gradient(105deg,#26191b_0%,#3d1b22_55%,#692d35_100%)] px-6 py-6 text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:px-8">
        <div className="relative z-10 max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f6b0a4]">Keep learning</p>
          <h2 className="mt-1 text-2xl font-bold">Learn. Build. Grow.</h2>
          <p className="mt-1 text-sm text-white/70">Explore your latest study materials and keep your progress moving forward.</p>
        </div>
        <LibraryBig className="absolute -right-2 -bottom-8 h-36 w-36 rotate-[-12deg] text-white/10 transition-transform group-hover:rotate-[-6deg]" strokeWidth={1} />
      </Link>

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
                          <Link href={`/student/tests/${t.id}`} className="text-xs font-medium text-[#ef5b3f] hover:underline">
                            View
                          </Link>
                        ) : overdue ? (
                          <span className="text-xs text-zinc-300">-</span>
                        ) : (
                          <LinkButton href={`/student/tests/${t.id}`} size="sm" className="!bg-[#ef5b3f] hover:!bg-[#d9472e]">
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
