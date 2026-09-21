import Link from "next/link";
import { Building2, ArrowRight, Users, FileText, BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { SemesterSelect } from "@/components/faculty/SemesterSelect";
import { CreateBatchForm } from "./CreateBatchForm";
import { Layers3 } from "lucide-react";

export default async function FacultyBatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const session = await getSession();
  const { semester } = await searchParams;

  const batches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    select: {
      id: true,
      name: true,
      department: true,
      semester: true,
      _count: { select: { submissions: true, tests: true } },
    },
    orderBy: { name: "asc" },
  });

  const semesters = [...new Set(batches.map((b) => b.semester))].sort();
  const activeSemester = semester && semesters.includes(semester) ? semester : "";
  const visible = activeSemester ? batches.filter((b) => b.semester === activeSemester) : batches;
  const batchIds = visible.map((b) => b.id);

  const [studentMemberships, batchKpis] = await Promise.all([
    // `_count.members` would also count the faculty on the roster, so student
    // headcount is counted explicitly.
    prisma.userBatch.findMany({
      where: { batchId: { in: batchIds }, user: { role: "STUDENT" } },
      select: { batchId: true },
    }),
    getLatestKpis({ scope: "BATCH", batchId: { in: batchIds }, metricName: "avg_test_score_pct" }),
  ]);

  const studentCount = new Map<string, number>();
  for (const m of studentMemberships) {
    studentCount.set(m.batchId, (studentCount.get(m.batchId) ?? 0) + 1);
  }
  const avgScoreByBatch = new Map(
    batchKpis.filter((k) => k.batchId).map((k) => [k.batchId as string, k.value]),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Batches"
        icon={Layers3}
        description="Manage your assigned batches and view their progress."
        actions={<SemesterSelect semesters={semesters} value={activeSemester} />}
      />

      <CreateBatchForm />

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No batches yet"
            description={
              batches.length === 0 ? "Create one above to get started." : "No batches in this semester."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((b) => {
            const students = studentCount.get(b.id) ?? 0;
            const avgScore = avgScoreByBatch.get(b.id);
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="flex items-start gap-3 px-4 pb-3 pt-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ef5b3f]/[0.08] text-[#ef5b3f]">
                    <Building2 size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-zinc-900">{b.name}</p>
                    <p className="truncate text-[12px] text-zinc-500">
                      {b.department} · {b.semester}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-zinc-100 border-y border-zinc-100">
                  <Stat icon={Users} value={String(students)} label="Students" />
                  <Stat icon={FileText} value={String(b._count.submissions)} label="Submissions" />
                  <Stat
                    icon={BarChart3}
                    value={avgScore === undefined ? "—" : `${avgScore.toFixed(0)}%`}
                    label="Avg. Score"
                  />
                </div>

                <div className="px-4 py-3">
                  <Link
                    href={`/faculty/batches/${b.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#ef5b3f]/20 bg-[#ef5b3f]/[0.06] px-3 py-2 text-[12.5px] font-medium text-[#ef5b3f] transition-colors hover:bg-[#ef5b3f] hover:text-white"
                  >
                    View Details <ArrowRight size={13} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3">
      <Icon size={14} className="text-zinc-300" />
      <p className="text-[18px] font-bold leading-tight text-zinc-900">{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
