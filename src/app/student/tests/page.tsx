import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { TestsBoard } from "@/components/student/TestsBoard";
import { ClipboardList } from "lucide-react";

export default async function StudentTestsPage() {
  const session = await getSession();
  const studentId = session!.sub;
  // Single query: this student's own response comes back with each test.
  const tests = await prisma.test.findMany({
    where: { publishedAt: { not: null }, batch: { members: { some: { userId: studentId } } } },
    include: {
      _count: { select: { questions: true } },
      responses: { where: { studentId }, select: { score: true, maxScore: true }, take: 1 },
    },
    orderBy: { dueAt: "asc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader icon={ClipboardList} title="Tests & Exams" description="Check your upcoming tests, past results, and performance." />
      <TestsBoard
        tests={tests.map((t) => {
          const response = t.responses[0];
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
