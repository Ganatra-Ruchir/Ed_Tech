import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td } from "@/components/Table";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyTestsPage() {
  const session = await getSession();

  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const tests = await prisma.test.findMany({
    where: { batchId: { in: batchIds } },
    include: {
      batch: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { questions: true, responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tests"
        actions={
          <LinkButton href="/faculty/tests/new" size="sm">
            <Plus size={14} /> New test
          </LinkButton>
        }
      />

      <Card className="overflow-hidden">
        {tests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tests yet" />
        ) : (
          <Table>
            <THead>
              <Th>Title</Th>
              <Th>Batch</Th>
              <Th>Questions</Th>
              <Th>Responses</Th>
              <Th>Status</Th>
              <Th>Due</Th>
              <Th></Th>
            </THead>
            <tbody>
              {tests.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-medium text-zinc-900">{t.title}</Td>
                  <Td className="text-zinc-500">{t.batch.name}</Td>
                  <Td className="text-zinc-500">{t._count.questions}</Td>
                  <Td className="text-zinc-500">{t._count.responses}</Td>
                  <Td>
                    {t.publishedAt ? (
                      <span className="text-emerald-700">Published</span>
                    ) : (
                      <span className="text-zinc-500">Draft</span>
                    )}
                  </Td>
                  <Td className="text-zinc-500">{fmtDate(t.dueAt)}</Td>
                  <Td>
                    <Link href={`/faculty/tests/${t.id}`} className="text-indigo-600 hover:underline">
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
