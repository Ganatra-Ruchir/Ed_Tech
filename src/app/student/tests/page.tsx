import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { TestsBoard } from "@/components/student/TestsBoard";
import { ClipboardList } from "lucide-react";

export default async function StudentTestsPage() {
  const session = await getSession();
  const studentId = session!.sub;
  const batchIds = await userBatchIds(studentId);

  const tests = await prisma.test.findMany({
    where: { publishedAt: { not: null }, batchId: { in: batchIds } },
    include: { _count: { select: { questions: true } } },
    orderBy: { dueAt: "asc" },
  });

  const responses = await prisma.testResponse.findMany({
    where: { studentId, testId: { in: tests.map((t) => t.id) } },
  });
  const responseByTest = new Map(responses.map((r) => [r.testId, r]));

  return (
    <div className="space-y-5">
      <PageHeader icon={ClipboardList} title="Tests & Exams" description="Check your upcoming tests, past results, and performance." />
      <TestsBoard
        tests={tests.map((t) => {
          const response = responseByTest.get(t.id);
          return {
            id: t.id,
            title: t.title,
            dueAt: t.dueAt,
            questionCount: t._count.questions,
            score: response?.score ?? null,
            maxScore: response?.maxScore ?? null,
            completed: Boolean(response),
          };
        })}
      />
    </div>
  );
}
