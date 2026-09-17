import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessStudent } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { GenerateReportButton } from "@/components/GenerateReportButton";

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{student.name}</h1>
          <p className="text-sm text-slate-500">
            {student.email} · {batch?.name ?? "Unassigned"}
          </p>
        </div>
        <GenerateReportButton scope="student" studentId={id} />
      </div>

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
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Submissions</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.title}</td>
                  <td className="px-4 py-2"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-2 text-slate-500">{fmtDate(s.createdAt)}</td>
                  <td className="px-4 py-2">
                    <a href={`/faculty/submissions/${s.id}`} className="text-indigo-600 hover:underline">
                      Open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Test performance</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Test</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {testResponses.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.test.title}</td>
                  <td className="px-4 py-2">{r.score ?? "-"} / {r.maxScore ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-500">{fmtDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
