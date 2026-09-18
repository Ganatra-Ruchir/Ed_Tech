import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { LinkButton } from "@/components/Button";
import { TestsBoard, type TestRow } from "@/components/faculty/TestsBoard";

export default async function FacultyTestsPage() {
  const session = await getSession();

  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const tests = await prisma.test.findMany({
    where: { batchId: { in: batchIds } },
    select: {
      id: true,
      title: true,
      dueAt: true,
      publishedAt: true,
      batch: { select: { name: true } },
      _count: { select: { questions: true, responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: TestRow[] = tests.map((t) => ({
    id: t.id,
    title: t.title,
    batchName: t.batch.name,
    questions: t._count.questions,
    responses: t._count.responses,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    published: Boolean(t.publishedAt),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Tests"
        description="Create, manage and view test performance."
        actions={
          <LinkButton href="/faculty/tests/new" size="sm" className="!bg-[#6b1029] hover:!bg-[#7c1638]">
            <Plus size={14} /> Create Test
          </LinkButton>
        }
      />

      <TestsBoard tests={rows} />
    </div>
  );
}
