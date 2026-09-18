import Link from "next/link";
import {
  Inbox,
  CheckCircle2,
  BarChart3,
  FileUp,
  ArrowRight,
  Plus,
  Users,
  FileText,
  MessageSquare,
  Activity,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/faculty/StatCard";
import { SemesterSelect } from "@/components/faculty/SemesterSelect";
import {
  SubmissionActivityChart,
  SubmissionStatusDonut,
  type ActivityPoint,
  type StatusSlice,
} from "@/components/faculty/DashboardCharts";
import {
  average,
  currentHour,
  greetingFor,
  pctChange,
  relativeTime,
  statusLabel,
  timeWindows,
  STATUS_HEX,
  SUBMISSION_STATUSES,
} from "@/components/faculty/faculty-format";

const QUICK_ACTIONS = [
  { href: "/faculty/review", label: "Review Queue", icon: Inbox, primary: true },
  { href: "/faculty/tests/new", label: "Create Test", icon: Plus, primary: true },
  { href: "/faculty/students", label: "View Students", icon: Users, primary: false },
  { href: "/faculty/reports", label: "Generate Report", icon: FileText, primary: false },
];

type FeedItem = {
  key: string;
  person: string;
  text: string;
  at: Date;
  href: string;
  tone: "indigo" | "emerald" | "amber";
  icon: typeof FileUp;
};

const FEED_TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

function deltaFromPct(
  change: number | null,
  fallback: string,
): { delta?: { text: string; direction: "up" | "down" | "flat" }; hint?: string } {
  if (change === null) return { hint: fallback };
  const rounded = Math.round(change);
  if (rounded === 0) return { delta: { text: "No change vs last week", direction: "flat" } };
  return {
    delta: {
      text: `${rounded > 0 ? "+" : ""}${rounded}% vs last week`,
      direction: rounded > 0 ? "up" : "down",
    },
  };
}

export default async function FacultyDashboard({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const session = await getSession();
  const { semester } = await searchParams;

  const myBatches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    select: { id: true, name: true, semester: true },
    orderBy: { name: "asc" },
  });

  const semesters = [...new Set(myBatches.map((b) => b.semester))].sort();
  const activeSemester = semester && semesters.includes(semester) ? semester : "";
  const scopedBatches = activeSemester ? myBatches.filter((b) => b.semester === activeSemester) : myBatches;
  const batchIds = scopedBatches.map((b) => b.id);

  const w = timeWindows();

  const [submissions, scoredResponses, recentSubmissions, recentReviews, recentFeedback] = await Promise.all([
    prisma.submission.findMany({
      where: { batchId: { in: batchIds } },
      select: { id: true, status: true, createdAt: true, reviewedAt: true },
    }),
    prisma.testResponse.findMany({
      where: { test: { batchId: { in: batchIds } }, score: { not: null }, maxScore: { gt: 0 } },
      select: { score: true, maxScore: true, submittedAt: true, createdAt: true },
    }),
    prisma.submission.findMany({
      where: { batchId: { in: batchIds } },
      select: { id: true, title: true, createdAt: true, student: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.submission.findMany({
      where: { batchId: { in: batchIds }, reviewedAt: { not: null } },
      select: {
        id: true,
        title: true,
        status: true,
        reviewedAt: true,
        student: { select: { name: true } },
      },
      orderBy: { reviewedAt: "desc" },
      take: 8,
    }),
    prisma.feedback.findMany({
      where: { submission: { batchId: { in: batchIds } } },
      select: {
        id: true,
        createdAt: true,
        faculty: { select: { name: true } },
        submission: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  // ---- Stat cards, all derived from the rows above -------------------------
  const pending = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "IN_REVIEW");
  const pendingNewThisWeek = pending.filter((s) => s.createdAt >= w.weekAgo).length;

  const reviewedThisWeek = submissions.filter((s) => s.reviewedAt && s.reviewedAt >= w.weekAgo).length;
  const reviewedLastWeek = submissions.filter(
    (s) => s.reviewedAt && s.reviewedAt >= w.twoWeeksAgo && s.reviewedAt < w.weekAgo,
  ).length;

  const submittedThisWeek = submissions.filter((s) => s.createdAt >= w.weekAgo).length;
  const submittedLastWeek = submissions.filter(
    (s) => s.createdAt >= w.twoWeeksAgo && s.createdAt < w.weekAgo,
  ).length;

  const pctOf = (r: { score: number | null; maxScore: number | null }) => (r.score! / r.maxScore!) * 100;
  const scoreDateOf = (r: { submittedAt: Date | null; createdAt: Date }) => r.submittedAt ?? r.createdAt;
  const avgScore = average(scoredResponses.map(pctOf));
  const last30 = scoredResponses.filter((r) => scoreDateOf(r) >= w.thirtyDaysAgo);
  const prev30 = scoredResponses.filter(
    (r) => scoreDateOf(r) >= w.sixtyDaysAgo && scoreDateOf(r) < w.thirtyDaysAgo,
  );
  const scoreShift =
    last30.length > 0 && prev30.length > 0
      ? average(last30.map(pctOf)) - average(prev30.map(pctOf))
      : null;

  // ---- Submission activity, bucketed by day over the trailing 30 days ------
  const activity: ActivityPoint[] = [];
  const buckets = new Map<string, ActivityPoint>();
  for (let i = 29; i >= 0; i--) {
    const day = w.dayStart(i);
    const key = day.toDateString();
    const point: ActivityPoint = {
      label: `${day.getDate()} ${day.toLocaleDateString("en-IN", { month: "short" })}`,
      submitted: 0,
      reviewed: 0,
    };
    buckets.set(key, point);
    activity.push(point);
  }
  for (const s of submissions) {
    const created = buckets.get(new Date(s.createdAt).toDateString());
    if (created && s.createdAt >= w.thirtyDaysAgo) created.submitted += 1;
    if (s.reviewedAt) {
      const reviewed = buckets.get(new Date(s.reviewedAt).toDateString());
      if (reviewed && s.reviewedAt >= w.thirtyDaysAgo) reviewed.reviewed += 1;
    }
  }

  const slices: StatusSlice[] = SUBMISSION_STATUSES.map((status) => ({
    name: statusLabel(status),
    value: submissions.filter((s) => s.status === status).length,
    color: STATUS_HEX[status],
  })).filter((s) => s.value > 0);

  // ---- Recent activity feed ------------------------------------------------
  const feed: FeedItem[] = [
    ...recentSubmissions.map((s) => ({
      key: `sub-${s.id}`,
      person: s.student.name,
      text: `${s.student.name} submitted ${s.title}`,
      at: s.createdAt,
      href: `/faculty/submissions/${s.id}`,
      tone: "indigo" as const,
      icon: FileUp,
    })),
    ...recentReviews.map((s) => ({
      key: `rev-${s.id}`,
      person: s.student.name,
      text: `${s.title} marked ${statusLabel(s.status)}`,
      at: s.reviewedAt as Date,
      href: `/faculty/submissions/${s.id}`,
      tone: "emerald" as const,
      icon: CheckCircle2,
    })),
    ...recentFeedback
      .filter((f) => f.submission !== null)
      .map((f) => ({
        key: `fb-${f.id}`,
        person: f.faculty.name,
        text: `${f.faculty.name} left feedback on ${f.submission!.title}`,
        at: f.createdAt,
        href: `/faculty/submissions/${f.submission!.id}`,
        tone: "amber" as const,
        icon: MessageSquare,
      })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const reviewedDelta = deltaFromPct(
    pctChange(reviewedThisWeek, reviewedLastWeek),
    `${reviewedLastWeek} reviewed last week`,
  );
  const submittedDelta = deltaFromPct(
    pctChange(submittedThisWeek, submittedLastWeek),
    `${submittedLastWeek} arrived last week`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {greetingFor(currentHour())}, Prof. {session!.name.split(" ")[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Here&apos;s your teaching and evaluation overview.</p>
        </div>
        <SemesterSelect semesters={semesters} value={activeSemester} />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending Reviews"
          value={String(pending.length)}
          icon={Inbox}
          tone="maroon"
          delta={
            pendingNewThisWeek > 0
              ? { text: `+${pendingNewThisWeek} new this week`, direction: "flat" }
              : undefined
          }
          hint={pendingNewThisWeek === 0 ? "Nothing new this week" : undefined}
        />
        <StatCard
          label="Reviewed This Week"
          value={String(reviewedThisWeek)}
          icon={CheckCircle2}
          tone="emerald"
          delta={reviewedDelta.delta}
          hint={reviewedDelta.hint}
        />
        <StatCard
          label="Avg Student Score"
          value={scoredResponses.length === 0 ? "—" : `${avgScore.toFixed(0)}%`}
          icon={BarChart3}
          tone="violet"
          delta={
            scoreShift === null
              ? undefined
              : {
                  text: `${scoreShift >= 0 ? "+" : ""}${scoreShift.toFixed(0)} pts vs prev 30 days`,
                  direction: scoreShift > 0 ? "up" : scoreShift < 0 ? "down" : "flat",
                }
          }
          hint={
            scoreShift === null
              ? `${scoredResponses.length} graded response${scoredResponses.length === 1 ? "" : "s"}`
              : undefined
          }
        />
        <StatCard
          label="Submissions This Week"
          value={String(submittedThisWeek)}
          icon={FileUp}
          tone="sky"
          delta={submittedDelta.delta}
          hint={submittedDelta.hint}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SubmissionActivityChart data={activity} />
        </div>
        <div className="lg:col-span-2">
          <SubmissionStatusDonut slices={slices} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Quick Actions</h2>
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={
                    a.primary
                      ? "flex items-center justify-center gap-1.5 rounded-md bg-[#6b1029] px-3 py-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-[#7c1638]"
                      : "flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  }
                >
                  <a.icon size={14} /> {a.label}
                </Link>
              ))}
            </div>
          </Card>
        </section>

        <section className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <Activity size={14} className="text-[#6b1029]" /> Recent Activity
            </h2>
            <Link
              href="/faculty/review"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              Review queue <ArrowRight size={11} />
            </Link>
          </div>
          <Card>
            {feed.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" description="Student work will show up here." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {feed.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-zinc-50">
                      <span className="shrink-0">
                        <Avatar name={item.person} size="sm" />
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${FEED_TONES[item.tone]}`}
                      >
                        <item.icon size={12} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-700">{item.text}</span>
                      <span className="shrink-0 text-[11px] text-zinc-400">{relativeTime(item.at, w.now)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
