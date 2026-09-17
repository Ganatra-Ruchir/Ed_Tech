import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCohortOverview } from "@/lib/dashboard";
import { getLatestKpis } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";

export default async function CohortAnalyticsPage() {
  const session = await getSession();
  if (!session!.isCC) redirect("/faculty");

  const overview = await getCohortOverview();

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
        <h1 className="text-lg font-semibold text-slate-900">Cohort Analytics</h1>
        <p className="text-sm text-slate-500">Cross-batch view for Course Coordinators.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Batches" value={String(overview.kpi.batchCount)} />
        <KpiCard label="Students" value={String(overview.kpi.studentCount)} />
        <KpiCard
          label="At-risk students"
          value={String(overview.kpi.atRiskCount)}
          tone={overview.kpi.atRiskCount > 0 ? "danger" : "success"}
        />
        <KpiCard label="Avg completion rate" value={`${overview.kpi.submissionCompletionRate.toFixed(0)}%`} />
        <KpiCard label="Avg test score" value={`${overview.kpi.avgTestScorePct.toFixed(0)}%`} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Trend</h2>
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
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-2">{b.studentCount}</td>
                  <td className={`px-4 py-2 ${b.atRiskCount > 0 ? "text-rose-600" : "text-slate-500"}`}>
                    {b.atRiskCount}
                  </td>
                  <td className="px-4 py-2">{b.submissionCompletionRate.toFixed(0)}%</td>
                  <td className="px-4 py-2">{b.avgTestScorePct.toFixed(0)}%</td>
                  <td className="px-4 py-2">
                    <Link href={`/faculty/cohort/batches/${b.id}`} className="text-indigo-600 hover:underline">
                      Drill down
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
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Batch</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {atRiskStudents.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {s.batchMemberships[0]?.batch.name ?? "-"}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/faculty/students/${s.id}`} className="text-indigo-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
