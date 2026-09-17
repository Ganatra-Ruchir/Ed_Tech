import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessBatch } from "@/lib/permissions";
import { getBatchOverview } from "@/lib/dashboard";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";
import { GenerateReportButton } from "@/components/GenerateReportButton";

export default async function CohortBatchDrilldown({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session!.isCC) redirect("/faculty");
  const { id } = await params;

  const allowed = await canAccessBatch(session!, id);
  if (!allowed) notFound();

  const overview = await getBatchOverview(id).catch(() => null);
  if (!overview) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{overview.batch.name}</h1>
          <p className="text-sm text-slate-500">
            {overview.batch.department} · Semester {overview.batch.semester}
          </p>
        </div>
        <GenerateReportButton scope="batch" batchId={id} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Students" value={String(overview.kpi.studentCount)} />
        <KpiCard
          label="At-risk"
          value={String(overview.kpi.atRiskCount)}
          tone={overview.kpi.atRiskCount > 0 ? "danger" : "success"}
        />
        <KpiCard label="Completion rate" value={`${overview.kpi.submissionCompletionRate.toFixed(0)}%`} />
        <KpiCard label="Avg test score" value={`${overview.kpi.avgTestScorePct.toFixed(0)}%`} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Trend</h2>
        <TrendChart history={overview.history} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Student roster</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Completion</th>
                <th className="px-4 py-2">Avg score</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {overview.students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-2">{s.submissionCompletionRate.toFixed(0)}%</td>
                  <td className="px-4 py-2">{s.avgTestScorePct.toFixed(0)}%</td>
                  <td className={`px-4 py-2 ${s.atRisk ? "text-rose-600" : "text-emerald-700"}`}>
                    {s.atRisk ? "At risk" : "On track"}
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
        </div>
      </section>
    </div>
  );
}
