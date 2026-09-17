import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessBatch } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td } from "@/components/Table";
import { PublishToggle } from "./PublishToggle";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyTestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      batch: true,
      questions: { orderBy: { order: "asc" } },
      responses: {
        include: { student: { select: { name: true } }, answers: { include: { question: true } } },
        orderBy: { submittedAt: "asc" },
      },
    },
  });
  if (!test) notFound();

  const allowed = await canAccessBatch(session!, test.batchId);
  if (!allowed) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={test.title}
        description={`${test.batch.name} · Due ${fmtDate(test.dueAt)} · ${test.questions.length} questions`}
        actions={<PublishToggle testId={test.id} published={Boolean(test.publishedAt)} />}
      />

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Questions</h2>
        <ol className="space-y-2">
          {test.questions.map((q, idx) => (
            <Card key={q.id} className="p-3 text-sm">
              <span className="font-medium">{idx + 1}.</span> {q.text}{" "}
              <span className="text-xs text-zinc-400">({q.type})</span>
            </Card>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Responses ({test.responses.length})
        </h2>
        <Card className="overflow-hidden">
          {test.responses.length === 0 ? (
            <EmptyState icon={Inbox} title="No responses yet" />
          ) : (
            <Table>
              <THead>
                <Th>Student</Th>
                <Th>Score</Th>
                <Th>Submitted</Th>
                <Th>Ungraded</Th>
                <Th></Th>
              </THead>
              <tbody>
                {test.responses.map((r) => {
                  const ungraded = r.answers.filter(
                    (a) => a.question.type === "SHORT_ANSWER" && a.isCorrect === null,
                  ).length;
                  return (
                    <Tr key={r.id}>
                      <Td className="font-medium text-zinc-900">{r.student.name}</Td>
                      <Td>{r.score ?? "-"} / {r.maxScore ?? "-"}</Td>
                      <Td className="text-zinc-500">{fmtDate(r.submittedAt)}</Td>
                      <Td>
                        {ungraded > 0 ? (
                          <span className="text-amber-700">{ungraded} pending</span>
                        ) : (
                          <span className="text-emerald-700">Done</span>
                        )}
                      </Td>
                      <Td>
                        <Link
                          href={`/faculty/test-responses/${r.id}`}
                          className="text-indigo-600 hover:underline"
                        >
                          View
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
