import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessBatch } from "@/lib/permissions";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{test.title}</h1>
          <p className="text-sm text-slate-500">
            {test.batch.name} · Due {fmtDate(test.dueAt)} · {test.questions.length} questions
          </p>
        </div>
        <PublishToggle testId={test.id} published={Boolean(test.publishedAt)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Questions</h2>
        <ol className="space-y-2">
          {test.questions.map((q, idx) => (
            <li key={q.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <span className="font-medium">{idx + 1}.</span> {q.text}{" "}
              <span className="text-xs text-slate-400">({q.type})</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Responses ({test.responses.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {test.responses.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No responses yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Ungraded</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {test.responses.map((r) => {
                  const ungraded = r.answers.filter(
                    (a) => a.question.type === "SHORT_ANSWER" && a.isCorrect === null,
                  ).length;
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">{r.student.name}</td>
                      <td className="px-4 py-2">{r.score ?? "-"} / {r.maxScore ?? "-"}</td>
                      <td className="px-4 py-2 text-slate-500">{fmtDate(r.submittedAt)}</td>
                      <td className="px-4 py-2">
                        {ungraded > 0 ? (
                          <span className="text-amber-700">{ungraded} pending</span>
                        ) : (
                          <span className="text-emerald-700">Done</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/faculty/test-responses/${r.id}`}
                          className="text-indigo-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
