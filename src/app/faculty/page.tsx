import { Inbox, ClipboardCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyReviewQueue({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const session = await getSession();
  const { batch: batchFilter } = await searchParams;

  const myBatches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    orderBy: { name: "asc" },
  });

  const batchIds = batchFilter ? [batchFilter] : myBatches.map((b) => b.id);

  const [pendingSubmissions, ungradedResponses] = await Promise.all([
    prisma.submission.findMany({
      where: { batchId: { in: batchIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      include: { student: { select: { name: true } }, batch: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.testResponse.findMany({
      where: {
        test: { batchId: { in: batchIds } },
        answers: { some: { question: { type: "SHORT_ANSWER" }, isCorrect: null } },
      },
      include: {
        student: { select: { name: true } },
        test: { select: { title: true, batch: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Review Queue"
        description="Pending submissions and test responses across your batches."
        actions={<BatchFilterSelect batches={myBatches} value={batchFilter ?? ""} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-600">
            <Inbox size={16} />
          </span>
          <div>
            <p className="text-xl font-semibold text-zinc-900">{pendingSubmissions.length}</p>
            <p className="text-xs font-medium text-zinc-500">Submissions awaiting review</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <ClipboardCheck size={16} />
          </span>
          <div>
            <p className="text-xl font-semibold text-zinc-900">{ungradedResponses.length}</p>
            <p className="text-xs font-medium text-zinc-500">Test responses needing grading</p>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Submissions awaiting review</h2>
        <Card>
          {pendingSubmissions.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing pending" description="Nice work." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pendingSubmissions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={s.student.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-900">{s.title}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {s.student.name} · {s.batch.name} · {fmtDate(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={s.status} />
                    <LinkButton href={`/faculty/submissions/${s.id}`} size="sm">
                      Review <ArrowRight size={12} />
                    </LinkButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Test responses needing grading</h2>
        <Card>
          {ungradedResponses.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All short-answer responses graded" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {ungradedResponses.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.student.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-900">{r.test.title}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {r.student.name} · {r.test.batch.name} · {fmtDate(r.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <LinkButton href={`/faculty/test-responses/${r.id}`} size="sm">
                    Grade <ArrowRight size={12} />
                  </LinkButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
