import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { assessStudentsRisk, RISK_LEVEL_ORDER } from "@/lib/risk";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState } from "@/components/EmptyState";

/**
 * "Who needs my attention today?" — every student in the faculty's batches
 * whose risk signals are above NORMAL, ordered by severity. Each row lists the
 * actual reasons so the list is actionable without opening every record.
 */
export default async function FacultyAtRiskPage() {
  const session = await getSession();
  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const memberships = await prisma.userBatch.findMany({
    where: { batchId: { in: batchIds }, user: { role: "STUDENT" } },
    include: { user: { select: { id: true, name: true, email: true } }, batch: { select: { name: true } } },
  });

  // De-duplicate students who belong to more than one of my batches.
  const studentById = new Map<string, { id: string; name: string; email: string; batchName: string }>();
  for (const m of memberships) {
    if (!studentById.has(m.user.id)) studentById.set(m.user.id, { ...m.user, batchName: m.batch.name });
  }
  const students = [...studentById.values()];
  const risks = await assessStudentsRisk(students.map((s) => s.id));

  const flagged = students
    .map((s) => ({ student: s, risk: risks.get(s.id)! }))
    .filter((r) => r.risk && r.risk.level !== "NORMAL")
    .sort(
      (a, b) => RISK_LEVEL_ORDER[b.risk.level] - RISK_LEVEL_ORDER[a.risk.level] || b.risk.score - a.risk.score,
    );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students needing attention"
        description={`${flagged.length} of ${students.length} students show risk signals, derived from submission, attendance and marks records.`}
      />

      <Card>
        {flagged.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No students flagged"
            description="Every student is within thresholds for assignments, attendance and marks."
          />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {flagged.map(({ student, risk }) => (
              <li key={student.id} className="flex flex-wrap items-start gap-3 px-4 py-3 hover:bg-zinc-50/70">
                <Avatar name={student.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/faculty/students/${student.id}`}
                      className="text-[13px] font-medium text-zinc-900 hover:underline"
                    >
                      {student.name}
                    </Link>
                    <RiskBadge level={risk.level} score={risk.score} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">{student.batchName}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {risk.reasons.map((r) => (
                      <li
                        key={r.code}
                        title={r.detail}
                        className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                      >
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/faculty/students/${student.id}`}
                  className="shrink-0 text-xs font-medium text-[#6b1029] hover:underline"
                >
                  Open record
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="flex items-start gap-1.5 text-[11px] text-zinc-400">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
        Risk is recomputed live from records on each load — no cached or estimated scores. Open a student record to see
        the full calculation behind every signal.
      </p>
    </div>
  );
}
