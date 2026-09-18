import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { EmptyState } from "@/components/EmptyState";
import { FileText } from "lucide-react";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export type StudentRecordData = {
  id: string;
  name: string;
  email: string;
  batchName: string;
  kpiByName: Record<string, number>;
  submissions: { id: string; title: string; status: string; createdAt: Date }[];
  testResponses: { id: string; test: { title: string }; score: number | null; maxScore: number | null; submittedAt: Date | null }[];
};

/**
 * Shared "record" body for a student — used both as the full page at
 * /admin(or faculty)/students/[id] and inside the slide-over Drawer that
 * intercepts the same route when navigated to from within the app.
 */
export function StudentRecordView({ data, compact }: { data: StudentRecordData; compact?: boolean }) {
  const { kpiByName } = data;
  return (
    <div className={compact ? "space-y-6" : "space-y-7"}>
      {!compact && (
        <PageHeader
          title={data.name}
          description={`${data.email} · ${data.batchName}`}
          actions={<GenerateReportButton scope="student" studentId={data.id} />}
        />
      )}
      {compact && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900">{data.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {data.email} · {data.batchName}
            </p>
          </div>
          <GenerateReportButton scope="student" studentId={data.id} />
        </div>
      )}

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
          {data.submissions.length === 0 ? (
            <EmptyState icon={FileText} title="No submissions yet" />
          ) : (
            <Table>
              <THead>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
              </THead>
              <TBody>
                {data.submissions.map((s) => (
                  <Tr key={s.id}>
                    <Td>{s.title}</Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="text-zinc-500">{fmtDate(s.createdAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Test performance</h2>
        <Card className="overflow-hidden">
          {data.testResponses.length === 0 ? (
            <EmptyState icon={FileText} title="No test responses yet" />
          ) : (
            <Table>
              <THead>
                <Th>Test</Th>
                <Th>Score</Th>
                <Th>Submitted</Th>
              </THead>
              <TBody>
                {data.testResponses.map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.test.title}</Td>
                    <Td>{r.score ?? "-"} / {r.maxScore ?? "-"}</Td>
                    <Td className="text-zinc-500">{fmtDate(r.submittedAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
