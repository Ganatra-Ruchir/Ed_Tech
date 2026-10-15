import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { loadAccessibleClass } from "@/lib/live/classes";
import { liveAttendanceRows } from "@/lib/live/attendance";
import { PageHeader } from "@/components/PageHeader";
import { SyncAttendanceButton } from "./SyncAttendanceButton";

function fmt(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
}

/** Post-class report shared by the faculty and admin portals. */
export async function LiveClassReport({ session, id, backHref }: { session: SessionPayload; id: string; backHref: string }) {
  const { liveClass, isHost } = await loadAccessibleClass(session, id);
  if (!liveClass || !isHost) notFound();
  const [rows, recordings, polls, questions] = await Promise.all([
    liveAttendanceRows(liveClass),
    prisma.liveClassRecording.findMany({ where: { liveClassId: id }, orderBy: { startedAt: "asc" } }),
    prisma.liveClassPoll.findMany({ where: { liveClassId: id }, include: { votes: { select: { optionIndex: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.liveClassQuestion.findMany({
      where: { liveClassId: id },
      include: { author: { select: { name: true } }, _count: { select: { votes: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const attended = rows.filter((r) => r.minutes > 0).length;
  const avgPercent = rows.length ? Math.round(rows.reduce((a, r) => a + r.percent, 0) / rows.length) : 0;

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#17212b]">
        <ArrowLeft size={14} /> Live classes
      </Link>
      <PageHeader
        title={liveClass.title}
        description={`${liveClass.batch.name}, hosted by ${liveClass.host.name}. Scheduled ${fmt(liveClass.scheduledAt)}; ran ${fmt(liveClass.startedAt)} to ${fmt(liveClass.endedAt)}.`}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Students attended", `${attended} of ${rows.length}`],
          ["Average attendance", `${avgPercent}%`],
          ["Polls run", String(polls.length)],
          ["Questions asked", String(questions.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-[#ebe5e1] bg-white p-4">
            <p className="text-[12px] text-[#667085]">{label}</p>
            <p className="mt-1 text-xl font-semibold text-[#17212b]">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-md border border-[#ebe5e1] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ebe5e1] px-4 py-3">
          <h2 className="flex-1 text-[14px] font-semibold text-[#17212b]">Attendance</h2>
          <a href={`/api/live-classes/${id}/attendance?format=csv`} className="lc-light-btn gap-1.5 px-3 text-[12px] font-semibold">
            <Download size={14} /> Download CSV
          </a>
          {liveClass.status === "ENDED" && <SyncAttendanceButton classId={id} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f7f8f5] text-left text-[11px] uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Minutes</th>
                <th className="px-4 py-2 font-medium">Attendance</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Left</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t border-[#eceee9]">
                  <td className="px-4 py-2.5 font-medium text-[#17212b]">{r.name}</td>
                  <td className={`px-4 py-2.5 ${r.status === "Absent" ? "text-rose-600" : "text-[#475467]"}`}>{r.status}</td>
                  <td className="px-4 py-2.5 text-[#475467]">{r.minutes}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#eceee9]">
                        <span className="block h-full bg-[#0b7a50]" style={{ width: `${r.percent}%` }} />
                      </span>
                      <span className="text-[#475467]">{r.percent}%</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#667085]">{r.firstJoinedAt ? fmt(new Date(r.firstJoinedAt)) : "—"}</td>
                  <td className="px-4 py-2.5 text-[#667085]">{r.lastLeftAt ? fmt(new Date(r.lastLeftAt)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-[#ebe5e1] bg-white p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-[#17212b]">Recordings</h2>
          {recordings.length === 0 ? (
            <p className="text-[13px] text-[#98a2b3]">This class wasn&apos;t recorded.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {recordings.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-[#475467]">
                    Recording {i + 1}
                    {r.durationSeconds ? `, ${Math.round(r.durationSeconds / 60)} min` : ""}
                  </span>
                  {r.fileUrl ? (
                    <a href={r.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#8f3032] underline">
                      Watch
                    </a>
                  ) : (
                    <span className="text-[#98a2b3]">{r.status === "FAILED" ? "Failed" : "Processing"}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-[#ebe5e1] bg-white p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-[#17212b]">Poll results</h2>
          {polls.length === 0 && <p className="text-[13px] text-[#98a2b3]">No polls were run.</p>}
          <div className="space-y-4">
            {polls.map((p) => {
              const options = JSON.parse(p.optionsJson) as string[];
              return (
                <div key={p.id}>
                  <p className="text-[13px] font-semibold text-[#17212b]">{p.question}</p>
                  <ul className="mt-1.5 space-y-1">
                    {options.map((o, i) => {
                      const n = p.votes.filter((v) => v.optionIndex === i).length;
                      const pct = p.votes.length ? Math.round((n / p.votes.length) * 100) : 0;
                      return (
                        <li key={i} className="flex items-center gap-2 text-[12px] text-[#475467]">
                          <span className="w-40 truncate">{o}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eceee9]">
                            <span className="block h-full bg-[#8f3032]" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-14 text-right">
                            {n} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-[#ebe5e1] bg-white p-4">
        <h2 className="mb-3 text-[14px] font-semibold text-[#17212b]">Questions from students</h2>
        {questions.length === 0 ? (
          <p className="text-[13px] text-[#98a2b3]">No questions were asked.</p>
        ) : (
          <ul className="divide-y divide-[#eceee9] text-[13px]">
            {questions.map((q) => (
              <li key={q.id} className="flex gap-3 py-2">
                <span className="flex-1 text-[#17212b]">{q.text}</span>
                <span className="shrink-0 text-[#98a2b3]">
                  {q.author.name}
                  {q.anonymous ? " (anonymous)" : ""}, {q._count.votes} upvotes{q.answered ? ", answered" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
