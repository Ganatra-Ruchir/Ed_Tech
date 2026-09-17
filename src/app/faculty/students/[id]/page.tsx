import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessStudent } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Table, THead, Th, Tr, Td } from "@/components/Table";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyStudentDrilldown({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    include: { batchMemberships: { include: { batch: true } } },
  });
  if (!student || student.role !== "STUDENT") notFound();

  const allowed = await canAccessStudent(session!, id);
  if (!allowed) notFound();

  const [submissions, testResponses, kpis] = await Promise.all([
    prisma.submission.findMany({ where: { studentId: id }, orderBy: { createdAt: "desc" } }),
    prisma.testResponse.findMany({
      where: { studentId: id },
      include: { test: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    getLatestKpis({ scope: "STUDENT", studentId: id }),
  ]);

  const kpiByName = Object.fromEntries(kpis.map((k) => [k.metricName, k.value]));
  const batch = student.batchMemberships[0]?.batch;

  return (
    <div className="space-y-7">
      <PageHeader
        title={student.name}
        description={`${student.email} · ${batch?.name ?? "Unassigned"}`}
        actions={<GenerateReportButton scope="student" studentId={id} />}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Completion rate" value={`${(kpiByName["submission_completion_rate"] ?? 0).toFixed(0)}%`} />
        <KpiCard label="Avg test score" value={`${(kpiByName["avg_test_score_pct"] ?? 0).toFixed(0)}%`} />
        <KpiCard label="Review turnaround" value={`${(kpiByName["review_turnaround_hours"] ?? 0).toFixed(0)}h`} />
        <KpiCard
          label="Status"
          value={(kpiByName["at_risk"] ?? 0) === 1 ? "At risk" : "On track"}
          tone={(kpiByName["at_risk"] ?? 0) === 1 ? "danger" : "success"}
        />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Submissions</h2>
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th></Th>
            </THead>
            <tbody>
              {submissions.map((s) => (
                <Tr key={s.id}>
                  <Td>{s.title}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td className="text-zinc-500">{fmtDate(s.createdAt)}</Td>
                  <Td>
                    <a href={`/faculty/submissions/${s.id}`} className="text-indigo-600 hover:underline">
                      Open
                    </a>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Test performance</h2>
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <Th>Test</Th>
              <Th>Score</Th>
              <Th>Submitted</Th>
            </THead>
            <tbody>
              {testResponses.map((r) => (
                <Tr key={r.id}>
                  <Td>{r.test.title}</Td>
                  <Td>{r.score ?? "-"} / {r.maxScore ?? "-"}</Td>
                  <Td className="text-zinc-500">{fmtDate(r.submittedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
