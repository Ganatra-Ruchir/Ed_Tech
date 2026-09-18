import { FileDown, FileText } from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { PageHeader } from "@/components/PageHeader";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { fmtDateTime } from "@/components/admin/format";
import { getAdminBatchRows, getAdminReportRows } from "@/components/admin/queries";

export default async function AdminReportsPage() {
  const [batches, reports] = await Promise.all([getAdminBatchRows(), getAdminReportRows()]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Generate batch performance PDFs and review everything generated so far."
      />

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Generate a batch report</h2>
        <Card className="overflow-hidden">
          {batches.length === 0 ? (
            <EmptyState icon={FileText} title="No batches to report on yet" />
          ) : (
            <Table>
              <THead>
                <Th>Batch</Th>
                <Th>Department</Th>
                <Th>Semester</Th>
                <Th>Students</Th>
                <Th>Submissions</Th>
                <Th></Th>
              </THead>
              <TBody>
                {batches.map((b) => (
                  <Tr key={b.id}>
                    <Td className="font-medium text-zinc-900">{b.name}</Td>
                    <Td className="text-zinc-500">{b.department}</Td>
                    <Td className="text-zinc-500">{b.semester}</Td>
                    <Td>{b.studentCount}</Td>
                    <Td>{b.submissionCount}</Td>
                    <Td>
                      <GenerateReportButton scope="batch" batchId={b.id} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Generated reports ({reports.length})</h2>
        <Card className="overflow-hidden">
          {reports.length === 0 ? (
            <EmptyState
              icon={FileDown}
              title="No reports generated yet"
              description="Generate a batch report above, or a student report from a student's record."
            />
          ) : (
            <Table>
              <THead>
                <Th>Scope</Th>
                <Th>Subject</Th>
                <Th>Generated</Th>
                <Th></Th>
              </THead>
              <TBody>
                {reports.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <span className="inline-flex whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                        {r.scope.toLowerCase()}
                      </span>
                    </Td>
                    <Td className="font-medium text-zinc-900">{r.subject}</Td>
                    <Td className="whitespace-nowrap text-zinc-500">{fmtDateTime(r.generatedAt)}</Td>
                    <Td>
                      <a
                        href={r.pdfPath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#6b1029] hover:underline"
                      >
                        <FileDown size={12} /> Open PDF
                      </a>
                    </Td>
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
