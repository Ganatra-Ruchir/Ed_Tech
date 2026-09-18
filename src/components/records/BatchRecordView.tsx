import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import type { getBatchOverview } from "@/lib/dashboard";

type Overview = Awaited<ReturnType<typeof getBatchOverview>>;

/**
 * Shared "record" body for a batch — used both as the full page at
 * /admin/batches/[id] and inside the slide-over Drawer that intercepts the
 * same route when navigated to from within the admin section.
 */
export function BatchRecordView({ overview, id, compact }: { overview: Overview; id: string; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-6" : "space-y-7"}>
      {!compact && (
        <PageHeader
          title={overview.batch.name}
          description={`${overview.batch.department} · Semester ${overview.batch.semester}`}
          actions={<GenerateReportButton scope="batch" batchId={id} />}
        />
      )}
      {compact && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900">{overview.batch.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {overview.batch.department} · Semester {overview.batch.semester}
            </p>
          </div>
          <GenerateReportButton scope="batch" batchId={id} />
        </div>
      )}

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
            <TBody>
              {overview.students.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium text-zinc-900">{s.name}</Td>
                  <Td>{s.submissionCompletionRate.toFixed(0)}%</Td>
                  <Td>{s.avgTestScorePct.toFixed(0)}%</Td>
                  <Td className={s.atRisk ? "text-rose-600" : "text-emerald-700"}>
                    {s.atRisk ? "At risk" : "On track"}
                  </Td>
                  <Td>
                    <Link href={`/admin/students/${s.id}`} className="text-indigo-600 hover:underline">
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
