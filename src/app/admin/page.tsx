import Link from "next/link";
import { Building2, Users, AlertTriangle, CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";
import { getCohortOverview } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";

export default async function AdminOverview() {
  const overview = await getCohortOverview();

  // Filter AFTER taking the latest snapshot per student — KPI is an
  // append-only log, so filtering by value first could surface a stale row.
  const atRiskLatest = await getLatestKpis({ scope: "STUDENT", metricName: "at_risk" });
  const atRiskStudentIds = atRiskLatest
    .filter((k) => k.value === 1)
    .map((k) => k.studentId)
    .filter((id): id is string => Boolean(id));
  const atRiskStudents = await prisma.user.findMany({
    where: { id: { in: atRiskStudentIds } },
    include: { batchMemberships: { include: { batch: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Department Cohort Overview</h1>
        <p className="text-sm text-slate-500">Read-only, live analytics across all batches.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Batches" value={String(overview.kpi.batchCount)} icon={Building2} />
        <KpiCard label="Students" value={String(overview.kpi.studentCount)} icon={Users} />
        <KpiCard
          label="At-risk students"
          value={String(overview.kpi.atRiskCount)}
          tone={overview.kpi.atRiskCount > 0 ? "danger" : "success"}
          icon={overview.kpi.atRiskCount > 0 ? AlertTriangle : CheckCircle2}
        />
        <KpiCard
          label="Avg completion rate"
          value={`${overview.kpi.submissionCompletionRate.toFixed(0)}%`}
          icon={CheckCircle2}
          progress={overview.kpi.submissionCompletionRate}
        />
        <KpiCard
          label="Avg test score"
          value={`${overview.kpi.avgTestScorePct.toFixed(0)}%`}
          icon={TrendingUp}
          progress={overview.kpi.avgTestScorePct}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Cohort trend</h2>
        <TrendChart history={overview.history} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Batches</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Students</th>
                <th className="px-4 py-2">At-risk</th>
                <th className="px-4 py-2">Completion</th>
                <th className="px-4 py-2">Avg score</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {overview.batches.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-2">{b.studentCount}</td>
                  <td className={`px-4 py-2 ${b.atRiskCount > 0 ? "font-medium text-rose-600" : "text-slate-500"}`}>
                    {b.atRiskCount}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-slate-700">{b.submissionCompletionRate.toFixed(0)}%</span>
                      <ProgressBar value={b.submissionCompletionRate} tone="auto" className="w-20" />
                    </div>
                  </td>
                  <td className="px-4 py-2">{b.avgTestScorePct.toFixed(0)}%</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/batches/${b.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Drill down <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          At-risk students ({atRiskStudents.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {atRiskStudents.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No students currently flagged at-risk.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {atRiskStudents.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.batchMemberships[0]?.batch.name ?? "-"}</p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                  >
                    View <ArrowRight size={12} />
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
