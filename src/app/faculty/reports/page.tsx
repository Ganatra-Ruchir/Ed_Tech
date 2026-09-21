import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { FileText } from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ReportGenerator } from "@/components/faculty/ReportGenerator";
import { fmtDateTime } from "@/components/faculty/faculty-format";

export default async function FacultyReportsPage() {
  const session = await getSession();

  const myBatches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    select: { id: true, name: true, department: true, semester: true },
    orderBy: { name: "asc" },
  });
  const batchIds = myBatches.map((b) => b.id);

  const memberships = await prisma.userBatch.findMany({
    where: { batchId: { in: batchIds }, user: { role: "STUDENT" } },
    select: {
      batch: { select: { name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const seen = new Set<string>();
  const students = memberships
    .filter((m) => (seen.has(m.user.id) ? false : (seen.add(m.user.id), true)))
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      batchName: m.batch.name,
    }));

  const recentReports = await prisma.report.findMany({
    where: {
      OR: [{ batchId: { in: batchIds } }, { studentId: { in: students.map((s) => s.id) } }],
    },
    orderBy: { generatedAt: "desc" },
    take: 10,
  });

  const studentName = new Map(students.map((s) => [s.id, s.name]));
  const batchName = new Map(myBatches.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-5">
      <PageHeader icon={FileText} title="Reports" description="Create PDF reports for students or batches." />

      <ReportGenerator students={students} batches={myBatches} />

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Recently Generated</h2>
        <Card className="overflow-hidden">
          {recentReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports generated yet"
              description="Generated PDFs are listed here for re-download."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentReports.map((r) => {
                const label =
                  r.scope === "STUDENT"
                    ? (studentName.get(r.studentId ?? "") ?? "Student report")
                    : (batchName.get(r.batchId ?? "") ?? "Batch report");
                return (
                  <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/[0.08] text-[#ef5b3f]">
                      <FileText size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-900">{label}</span>
                      <span className="block truncate text-[11px] text-zinc-400">
                        {r.scope === "STUDENT" ? "Student report" : "Batch report"} ·{" "}
                        {fmtDateTime(r.generatedAt)}
                      </span>
                    </span>
                    <a
                      href={r.pdfPath}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Open PDF
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
