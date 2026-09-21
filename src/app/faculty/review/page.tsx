import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ReviewQueueBoard, type QueueItem } from "@/components/faculty/ReviewQueueBoard";
import { timeWindows } from "@/components/faculty/faculty-format";
import { Inbox } from "lucide-react";

export default async function FacultyReviewQueue() {
  const session = await getSession();

  const myBatches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const batchIds = myBatches.map((b) => b.id);

  const [submissions, ungradedResponses] = await Promise.all([
    prisma.submission.findMany({
      where: { batchId: { in: batchIds } },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        batchId: true,
        student: { select: { name: true } },
        batch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.testResponse.findMany({
      where: {
        test: { batchId: { in: batchIds } },
        answers: { some: { question: { type: "SHORT_ANSWER" }, isCorrect: null } },
      },
      select: {
        id: true,
        submittedAt: true,
        student: { select: { name: true } },
        test: { select: { title: true, batchId: true, batch: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const items: QueueItem[] = [
    ...submissions.map((s) => ({
      id: s.id,
      kind: "submission" as const,
      title: s.title,
      studentName: s.student.name,
      batchId: s.batchId,
      batchName: s.batch.name,
      date: s.createdAt.toISOString(),
      status: s.status as string,
      href: `/faculty/submissions/${s.id}`,
    })),
    ...ungradedResponses.map((r) => ({
      id: r.id,
      kind: "grading" as const,
      title: r.test.title,
      studentName: r.student.name,
      batchId: r.test.batchId,
      batchName: r.test.batch.name,
      date: r.submittedAt ? r.submittedAt.toISOString() : null,
      status: null,
      href: `/faculty/test-responses/${r.id}`,
    })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Inbox}
        title="Submissions"
        description="Review and provide feedback on student submissions."
      />

      <ReviewQueueBoard items={items} batches={myBatches} nowMs={timeWindows().now} />
    </div>
  );
}
