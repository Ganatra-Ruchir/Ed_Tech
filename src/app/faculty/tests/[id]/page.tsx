import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessBatch } from "@/lib/permissions";
import { average, fmtDate } from "@/components/faculty/faculty-format";
import {
  TestAnalytics,
  type DistributionBucket,
  type Insight,
  type QuestionRow,
  type ResultRow,
} from "@/components/faculty/TestAnalytics";
import { PublishToggle } from "./PublishToggle";

const BUCKETS = ["0-20", "21-40", "41-60", "61-80", "81-100"] as const;

function bucketFor(pct: number): string {
  if (pct <= 20) return "0-20";
  if (pct <= 40) return "21-40";
  if (pct <= 60) return "41-60";
  if (pct <= 80) return "61-80";
  return "81-100";
}

export default async function FacultyTestDetail({ params }: { params: Promise<{ id: string }> }) {
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

  const assigned = await prisma.userBatch.count({
    where: { batchId: test.batchId, user: { role: "STUDENT" } },
  });

  const submitted = test.responses.filter((r) => r.submittedAt !== null).length;

  const scored = test.responses
    .filter((r) => r.score !== null && r.maxScore !== null && r.maxScore > 0)
    .map((r) => ({ id: r.id, pct: (r.score! / r.maxScore!) * 100 }));
  const avgScorePct = scored.length > 0 ? average(scored.map((s) => s.pct)) : null;
  const below50 = scored.filter((s) => s.pct < 50).length;

  const distribution: DistributionBucket[] = BUCKETS.map((bucket) => ({
    bucket,
    count: scored.filter((s) => bucketFor(s.pct) === bucket).length,
  }));

  const results: ResultRow[] = test.responses.map((r) => {
    const pct =
      r.score !== null && r.maxScore !== null && r.maxScore > 0 ? (r.score / r.maxScore) * 100 : null;
    return {
      id: r.id,
      studentName: r.student.name,
      score: r.score,
      maxScore: r.maxScore,
      scorePct: pct,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      ungraded: r.answers.filter((a) => a.question.type === "SHORT_ANSWER" && a.isCorrect === null).length,
    };
  });

  const allAnswers = test.responses.flatMap((r) => r.answers);
  const questions: QuestionRow[] = test.questions.map((q, idx) => {
    const forQuestion = allAnswers.filter((a) => a.questionId === q.id && a.isCorrect !== null);
    return {
      id: q.id,
      index: idx + 1,
      text: q.text,
      type: q.type,
      graded: forQuestion.length,
      correct: forQuestion.filter((a) => a.isCorrect === true).length,
    };
  });

  // Every insight below is a restatement of a number computed above — nothing
  // here is generated or guessed.
  const insights: Insight[] = [];
  if (avgScorePct !== null) {
    insights.push(
      avgScorePct >= 70
        ? { text: `Good overall performance — the batch averages ${avgScorePct.toFixed(0)}%.`, tone: "good" }
        : {
            text: `The batch averages ${avgScorePct.toFixed(0)}% — below the 70% comfort mark.`,
            tone: "warn",
          },
    );
  }
  if (assigned > 0) {
    insights.push({
      text: `${submitted} of ${assigned} assigned students have submitted (${((submitted / assigned) * 100).toFixed(0)}%).`,
      tone: submitted === assigned ? "good" : "info",
    });
  }
  if (below50 > 0) {
    insights.push({ text: `${below50} student${below50 === 1 ? "" : "s"} scored below 50%.`, tone: "warn" });
  }
  const gradedQuestions = questions.filter((q) => q.graded > 0);
  if (gradedQuestions.length > 0) {
    const weakest = gradedQuestions.reduce((lo, q) =>
      q.correct / q.graded < lo.correct / lo.graded ? q : lo,
    );
    insights.push({
      text: `Q${weakest.index} had the lowest accuracy (${((weakest.correct / weakest.graded) * 100).toFixed(0)}%).`,
      tone: "info",
    });
  }
  const pendingGrading = results.reduce((sum, r) => sum + r.ungraded, 0);
  if (pendingGrading > 0) {
    insights.push({
      text: `${pendingGrading} short-answer answer${pendingGrading === 1 ? "" : "s"} still need grading.`,
      tone: "warn",
    });
  }

  return (
    <div className="space-y-5">
      <Link
        href="/faculty/tests"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft size={13} /> Back to tests
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{test.title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {test.batch.name} · Due {fmtDate(test.dueAt)} · {test.questions.length} question
            {test.questions.length === 1 ? "" : "s"}
          </p>
        </div>
        <PublishToggle testId={test.id} published={Boolean(test.publishedAt)} />
      </div>

      <TestAnalytics
        stats={{ assigned, submitted, scoredCount: scored.length, avgScorePct, below50 }}
        distribution={distribution}
        insights={insights}
        results={results}
        questions={questions}
      />
    </div>
  );
}
