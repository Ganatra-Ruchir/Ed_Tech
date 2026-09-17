import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GenerateReportButton } from "@/components/GenerateReportButton";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">My Progress Report</h1>
          <p className="text-sm text-slate-500">
            Includes your submission history, test performance, and Project Development Canvas.
          </p>
        </div>
        <GenerateReportButton scope="student" studentId={session!.sub} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {reports.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No reports generated yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-600">Generated {fmtDateTime(r.generatedAt)}</span>
                <a
                  href={r.pdfPath}
                  target="_blank"
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  View PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
