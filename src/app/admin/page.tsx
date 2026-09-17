import Link from "next/link";
import { Building2, Users, AlertTriangle, CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";
import { getCohortOverview } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";
import { getLatestKpis } from "@/lib/kpi";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td } from "@/components/Table";

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
    <div className="space-y-7">
      <PageHeader title="Department Cohort Overview" description="Read-only, live analytics across all batches." />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Batches" value={String(overview.kpi.batchCount)} icon={Building2} />
        <KpiCard label="Students" value={String(overview.kpi.studentCount)} icon={Users} />
        <KpiCard
          label="At-risk"
          value={String(overview.kpi.atRiskCount)}
          tone={overview.kpi.atRiskCount > 0 ? "danger" : "success"}
          icon={overview.kpi.atRiskCount > 0 ? AlertTriangle : CheckCircle2}
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
          icon={TrendingUp}
          progress={overview.kpi.avgTestScorePct}
        />
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Cohort trend</h2>
        <TrendChart history={overview.history} />
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Batches</h2>
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <Th>Batch</Th>
              <Th>Students</Th>
              <Th>At-risk</Th>
              <Th>Completion</Th>
              <Th>Avg score</Th>
              <Th></Th>
            </THead>
            <tbody>
              {overview.batches.map((b) => (
                <Tr key={b.id}>
                  <Td className="font-medium text-zinc-900">{b.name}</Td>
                  <Td>{b.studentCount}</Td>
                  <Td className={b.atRiskCount > 0 ? "font-medium text-rose-600" : "text-zinc-500"}>
                    {b.atRiskCount}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-zinc-700">{b.submissionCompletionRate.toFixed(0)}%</span>
                      <ProgressBar value={b.submissionCompletionRate} tone="auto" className="w-20" />
                    </div>
                  </Td>
                  <Td>{b.avgTestScorePct.toFixed(0)}%</Td>
                  <Td>
                    <Link
                      href={`/admin/batches/${b.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Drill down <ArrowRight size={12} />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">
          At-risk students ({atRiskStudents.length})
        </h2>
        <Card>
          {atRiskStudents.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No students currently flagged at-risk" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {atRiskStudents.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <p className="text-[13px] font-medium text-zinc-900">{s.name}</p>
                      <p className="text-xs text-zinc-400">{s.batchMemberships[0]?.batch.name ?? "-"}</p>
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
        </Card>
      </section>
    </div>
  );
}
