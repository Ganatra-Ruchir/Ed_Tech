import Link from "next/link";
import {
  Users,
  GraduationCap,
  Building2,
  FileText,
  BarChart3,
  ScrollText,
  Activity,
  ArrowRight,
  Zap,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PerformanceDonut } from "@/components/admin/PerformanceDonut";
import { SemesterFilter } from "@/components/admin/SemesterFilter";
import { SubmissionTrendChart } from "@/components/admin/SubmissionTrendChart";
import { getAdminDashboardData } from "@/components/admin/queries";

const QUICK_ACTIONS = [
  { href: "/admin/students", label: "Manage students", icon: Users },
  { href: "/admin/faculty", label: "Manage faculty", icon: GraduationCap },
  { href: "/admin/batches", label: "Manage batches", icon: Building2 },
  { href: "/admin/analytics", label: "View analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/audit", label: "Audit logs", icon: ScrollText },
];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const { semester } = await searchParams;
  const session = await getSession();
  const data = await getAdminDashboardData(semester);
  const { stats } = data;

  const scopeNote = data.activeSemester ? `Semester ${data.activeSemester}` : "All semesters";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {data.greeting}, {session!.name.split(" ")[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Here&apos;s the overview of Silver Oak University&apos;s academic progress.
          </p>
        </div>
        <SemesterFilter semesters={data.semesters} value={data.activeSemester} />
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Total Students"
          value={String(stats.studentCount)}
          icon={Users}
          tone="maroon"
          delta={stats.newStudents > 0 ? `+${stats.newStudents} new` : undefined}
          footnote={stats.newStudents > 0 ? "in the last 30 days" : scopeNote}
        />
        <AdminStatCard
          label="Faculty Members"
          value={String(stats.facultyCount)}
          icon={GraduationCap}
          tone="emerald"
          delta={stats.newFaculty > 0 ? `+${stats.newFaculty} new` : undefined}
          footnote={stats.newFaculty > 0 ? "in the last 30 days" : scopeNote}
        />
        <AdminStatCard
          label="Batches"
          value={String(stats.batchCount)}
          icon={Building2}
          tone="violet"
          delta={stats.newBatches > 0 ? `+${stats.newBatches} new` : undefined}
          footnote={stats.newBatches > 0 ? "in the last 30 days" : scopeNote}
        />
        <AdminStatCard
          label="Total Submissions"
          value={String(stats.submissionCount)}
          icon={FileText}
          tone="amber"
          delta={stats.newSubmissions > 0 ? `+${stats.newSubmissions} new` : undefined}
          footnote={`${stats.pendingReviewCount} awaiting review`}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <Card className="p-4">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-zinc-900">Submission Trend</h2>
              <p className="text-[11px] text-zinc-400">Last 6 months · {scopeNote}</p>
            </div>
            <SubmissionTrendChart data={data.trend} />
          </Card>
        </section>

        <section>
          <Card className="p-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Overall Performance</h2>
            <p className="mb-3 mt-0.5 text-[11px] text-zinc-400">
              {data.scoredStudentCount} student{data.scoredStudentCount === 1 ? "" : "s"} with graded tests
            </p>
            <PerformanceDonut
              slices={data.performance}
              centerValue={`${Math.round(data.avgScorePct)}%`}
              centerLabel="Avg. score"
              emptyMessage="No graded test responses yet."
            />
          </Card>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
              <Activity size={14} className="text-[#6b1029]" /> Recent Activities
            </h2>
            <Link href="/admin/audit" className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              View audit log <ArrowRight size={11} />
            </Link>
          </div>
          <Card>
            {data.activity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity recorded yet"
                description="Submissions and audited actions appear here as they happen."
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data.activity.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span
                      className={
                        item.kind === "submission"
                          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6b1029]/[0.08] text-[#6b1029]"
                          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                      }
                    >
                      {item.kind === "submission" ? <FileText size={13} /> : <ScrollText size={13} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {item.href ? (
                        <Link href={item.href} className="block truncate text-[13px] font-medium text-zinc-900 hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="truncate text-[13px] font-medium text-zinc-900">{item.title}</p>
                      )}
                      <p className="truncate text-[11px] text-zinc-400">{item.meta}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-400">{item.ago}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
            <Zap size={14} className="text-[#6b1029]" /> Quick Actions
          </h2>
          <Card className="p-2">
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-[#6b1029]/[0.06] hover:text-[#6b1029]"
                    >
                      <Icon size={15} className="shrink-0 text-[#6b1029]" />
                      <span className="truncate">{action.label}</span>
                      <ArrowRight size={13} className="ml-auto shrink-0 text-zinc-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}
