import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessBatch } from "@/lib/permissions";
import { getBatchOverview } from "@/lib/dashboard";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Table, THead, Th, Tr, Td } from "@/components/Table";

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
    <div className="space-y-7">
      <PageHeader
        title={overview.batch.name}
        description={`${overview.batch.department} · Semester ${overview.batch.semester}`}
        actions={<GenerateReportButton scope="batch" batchId={id} />}
      />

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
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Trend</h2>
        <TrendChart history={overview.history} />
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Student roster</h2>
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <Th>Student</Th>
              <Th>Completion</Th>
              <Th>Avg score</Th>
              <Th>Status</Th>
              <Th></Th>
            </THead>
            <tbody>
              {overview.students.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium text-zinc-900">{s.name}</Td>
                  <Td>{s.submissionCompletionRate.toFixed(0)}%</Td>
                  <Td>{s.avgTestScorePct.toFixed(0)}%</Td>
                  <Td className={s.atRisk ? "text-rose-600" : "text-emerald-700"}>
                    {s.atRisk ? "At risk" : "On track"}
                  </Td>
                  <Td>
                    <Link href={`/faculty/students/${s.id}`} className="text-indigo-600 hover:underline">
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
