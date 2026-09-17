import { FileText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function StudentReportsPage() {
  const session = await getSession();

  const reports = await prisma.report.findMany({
    where: { studentId: session!.sub },
    orderBy: { generatedAt: "desc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="My Progress Report"
        description="Includes your submission history, test performance, and Project Development Canvas."
        actions={<GenerateReportButton scope="student" studentId={session!.sub} />}
      />

      <Card>
        {reports.length === 0 ? (
          <EmptyState icon={FileText} title="No reports generated yet" />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-600">Generated {fmtDateTime(r.generatedAt)}</span>
                <a
                  href={r.pdfPath}
                  target="_blank"
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  View PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
