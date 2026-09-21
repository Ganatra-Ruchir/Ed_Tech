import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, Building2, CheckCircle2, Clock, Users } from "lucide-react";
import { getCohortOverview } from "@/lib/dashboard";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { TrendChart } from "@/components/TrendChart";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { getAdminAnalyticsData, getAtRiskStudents } from "@/components/admin/queries";

export default async function AdminAnalyticsPage() {
  const [overview, analytics, atRisk] = await Promise.all([
    getCohortOverview(),
    getAdminAnalyticsData(),
    getAtRiskStudents(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports &amp; Analytics"
        description="Live cohort analytics computed from recorded submissions, reviews and test scores."
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Batches" value={String(overview.kpi.batchCount)} icon={Building2} />
        <KpiCard label="Students" value={String(overview.kpi.studentCount)} icon={Users} />
        <KpiCard
          label="At-risk"
          value={String(atRisk.length)}
          tone={atRisk.length > 0 ? "danger" : "success"}
          icon={atRisk.length > 0 ? AlertTriangle : CheckCircle2}
        />
        <KpiCard
          label="Avg completion"
          value={`${overview.kpi.submissionCompletionRate.toFixed(0)}%`}
          icon={CheckCircle2}
          progress={overview.kpi.submissionCompletionRate}
        />
        <KpiCard
          label="Avg test score"
          value={`${overview.kpi.avgTestScorePct.toFixed(0)}%`}
          icon={BarChart3}
          progress={overview.kpi.avgTestScorePct}
        />
        <KpiCard
          label="Review turnaround"
          value={analytics.reviewedCount === 0 ? "-" : `${analytics.turnaroundHours.toFixed(0)}h`}
          icon={Clock}
        />
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Cohort trend</h2>
        <TrendChart history={overview.history} />
      </section>

      <AnalyticsTabs
        data={{
          submissionStatus: analytics.submissionStatus,
          totalSubmissions: analytics.totalSubmissions,
          scoreDistribution: analytics.scoreDistribution,
          avgScoreByBatch: analytics.avgScoreByBatch,
          completionByBatch: analytics.completionByBatch,
          performance: analytics.performance,
          avgScorePct: analytics.avgScorePct,
          scoredStudentCount: analytics.scoredStudentCount,
        }}
      />

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">At-risk students ({atRisk.length})</h2>
        <Card>
          {atRisk.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No students currently flagged at-risk" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {atRisk.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={s.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-900">{s.name}</p>
                      <p className="truncate text-xs text-zinc-400">{s.batch}</p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#ef5b3f] hover:underline"
                  >
                    View <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
