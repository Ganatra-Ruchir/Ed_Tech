"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Check, CheckCircle2, History, LoaderCircle, Search, UserCheck, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Input, Select } from "@/components/Field";
import { Avatar } from "@/components/Avatar";

type Student = { id: string; name: string; email: string; studentNumber: string | null };
type Batch = { id: string; name: string; department: string; semester: string; students: Student[] };
type Status = "PRESENT" | "ABSENT";
type StudentStat = { present: number; absent: number; total: number; percentage: number };
type HistoryItem = { date: string; present: number; absent: number; total: number; percentage: number };

function localDateInput(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputFromIso(value: string) {
  return localDateInput(new Date(value));
}

export function LectureAttendance({ batches, initialBatchId }: { batches: Batch[]; initialBatchId: string }) {
  const today = useMemo(() => localDateInput(), []);
  const [batchId, setBatchId] = useState(initialBatchId);
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [studentStats, setStudentStats] = useState<Record<string, StudentStat>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const batch = batches.find((item) => item.id === batchId);
  const students = batch?.students ?? [];

  useEffect(() => {
    if (!batchId) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      setSaved(false);
      fetch(`/api/attendance?batchId=${encodeURIComponent(batchId)}&date=${date}`, { signal: controller.signal })
        .then(async (response) => ({ response, data: await response.json() }))
        .then(({ response, data }) => {
          if (!response.ok) throw new Error(data.error ?? "Could not load attendance");
          setMarks(Object.fromEntries((data.records ?? []).map((record: { studentId: string; status: Status }) => [record.studentId, record.status])));
          setStudentStats(data.studentStats ?? {});
          setHistory(data.history ?? []);
        })
        .catch((loadError) => {
          if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Could not load attendance");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [batchId, date]);

  const filteredStudents = students.filter((student) => {
    const value = query.trim().toLowerCase();
    return !value || student.name.toLowerCase().includes(value) || student.email.toLowerCase().includes(value) || student.studentNumber?.toLowerCase().includes(value);
  });
  const present = students.filter((student) => marks[student.id] === "PRESENT").length;
  const absent = students.filter((student) => marks[student.id] === "ABSENT").length;
  const unmarked = students.length - present - absent;
  const marked = present + absent;
  const classRate = marked === 0 ? 0 : Math.round((present / marked) * 1000) / 10;

  function markAll(status: Status) {
    setMarks(Object.fromEntries(students.map((student) => [student.id, status])));
    setSaved(false);
  }

  async function saveAttendance() {
    if (!batch || unmarked > 0) {
      setError(`Mark all ${students.length} students before saving.`);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          date,
          records: students.map((student) => ({ studentId: student.id, status: marks[student.id] })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save attendance");
      setStudentStats(data.studentStats ?? {});
      setHistory(data.history ?? []);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  if (batches.length === 0) {
    return <div className="space-y-5"><PageHeader icon={CalendarDays} title="Attendance" description="Mark and view student attendance for your courses." /><div className="rounded-md border border-[#dfe3dc] bg-white p-8 text-center text-sm text-[#667085]">No batches are assigned to your account.</div></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarDays} title="Attendance" description="Mark the full class roster, revisit earlier dates, and monitor attendance percentages." />

      <section className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#475467]">Batch<Select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="mt-1.5">{batches.map((item) => <option key={item.id} value={item.id}>{item.name} · Semester {item.semester}</option>)}</Select></label>
          <label className="text-xs font-semibold text-[#475467]">Lecture date<Input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} className="mt-1.5" /></label>
        </div>
        {batch && <p className="mt-3 text-xs text-[#667085]">{batch.department} · {students.length} enrolled students</p>}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Present", value: present, icon: UserCheck, color: "text-emerald-700 bg-emerald-50" },
          { label: "Absent", value: absent, icon: UserX, color: "text-rose-700 bg-rose-50" },
          { label: "Unmarked", value: unmarked, icon: Users, color: "text-amber-700 bg-amber-50" },
          { label: "Class rate", value: `${classRate}%`, icon: CalendarDays, color: "text-[#d9472e] bg-[#ef5b3f]/10" },
        ].map((item) => <div key={item.label} className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm"><span className={`flex h-8 w-8 items-center justify-center rounded-md ${item.color}`}><item.icon size={16} /></span><p className="mt-3 text-2xl font-semibold text-[#17212b]">{item.value}</p><p className="text-xs text-[#667085]">{item.label}</p></div>)}
      </section>

      <section className="overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e7eae4] px-4 py-3 sm:px-5">
          <div className="relative min-w-[220px] flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..." className="pl-9" /></div>
          <Button variant="secondary" size="sm" onClick={() => markAll("PRESENT")}><UserCheck size={14} /> All present</Button>
          <Button variant="secondary" size="sm" onClick={() => markAll("ABSENT")}><UserX size={14} /> All absent</Button>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#667085]"><LoaderCircle size={16} className="animate-spin" /> Loading attendance...</div> : (
          <div className="divide-y divide-[#eceee9]">
            <div className="hidden grid-cols-[minmax(220px,1fr)_90px_90px_90px_90px_220px] gap-3 bg-[#f7f8f5] px-5 py-2.5 text-[11px] font-semibold uppercase text-[#667085] lg:grid">
              <span>Student</span>
              <span className="text-center">Attendance %</span>
              <span className="text-center">Total lectures</span>
              <span className="text-center">Present</span>
              <span className="text-center">Absent</span>
              <span className="text-center">Mark for selected date</span>
            </div>
            {filteredStudents.map((student, index) => {
              const status = marks[student.id];
              const stat = studentStats[student.id] ?? { present: 0, absent: 0, total: 0, percentage: 0 };
              const metrics = [
                { label: "Attendance %", value: `${stat.percentage}%`, color: stat.percentage >= 75 ? "text-emerald-700" : stat.total === 0 ? "text-[#667085]" : "text-rose-700" },
                { label: "Total lectures", value: stat.total, color: "text-[#17212b]" },
                { label: "Present", value: stat.present, color: "text-emerald-700" },
                { label: "Absent", value: stat.absent, color: "text-rose-700" },
              ];
              return <motion.div key={student.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.25) }} className="grid items-center gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(220px,1fr)_90px_90px_90px_90px_220px] lg:py-3">
                <div className="flex min-w-0 items-center gap-3"><Avatar name={student.name} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#17212b]">{student.name}</span><span className="block truncate text-[11px] text-[#667085]">{student.studentNumber || student.email}</span></span></div>
                {metrics.map((metric) => <div key={metric.label} className="flex items-center justify-between rounded-md bg-[#f7f8f5] px-3 py-2 lg:block lg:bg-transparent lg:px-0 lg:py-0 lg:text-center"><span className="text-[11px] font-medium text-[#667085] lg:hidden">{metric.label}</span><span className={`text-sm font-semibold ${metric.color}`}>{metric.value}</span></div>)}
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#d6dbd3]">
                  <button type="button" onClick={() => { setMarks((current) => ({ ...current, [student.id]: "PRESENT" })); setSaved(false); }} className={`flex h-9 items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${status === "PRESENT" ? "bg-emerald-600 text-white" : "bg-white text-[#667085] hover:bg-emerald-50 hover:text-emerald-700"}`}><Check size={14} /> Present</button>
                  <button type="button" onClick={() => { setMarks((current) => ({ ...current, [student.id]: "ABSENT" })); setSaved(false); }} className={`flex h-9 items-center justify-center gap-1.5 border-l border-[#d6dbd3] text-xs font-semibold transition-colors ${status === "ABSENT" ? "bg-rose-600 text-white" : "bg-white text-[#667085] hover:bg-rose-50 hover:text-rose-700"}`}><UserX size={14} /> Absent</button>
                </div>
              </motion.div>;
            })}
            {filteredStudents.length === 0 && <p className="px-5 py-12 text-center text-sm text-[#667085]">No students match your search.</p>}
          </div>
        )}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7eae4] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div>{error ? <p role="alert" className="text-xs text-rose-600">{error}</p> : saved ? <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> Attendance saved for {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p> : <p className="text-xs text-[#667085]">{marked} of {students.length} marked</p>}</div>
          <Button onClick={saveAttendance} disabled={saving || loading || students.length === 0 || unmarked > 0}>{saving ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}{saving ? "Saving..." : "Save attendance"}</Button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2"><History size={16} className="text-[#ef5b3f]" /><h2 className="text-sm font-semibold text-[#17212b]">Attendance history</h2></div>
        {history.length === 0 ? <div className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-10 text-center text-sm text-[#667085]">Saved lecture dates will appear here.</div> : <div className="overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f7f8f5] text-xs text-[#667085]"><tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Present</th><th className="px-4 py-3 font-semibold">Absent</th><th className="px-4 py-3 font-semibold">Class rate</th><th className="px-4 py-3 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-[#eceee9]">{history.map((item) => <tr key={item.date}><td className="whitespace-nowrap px-4 py-3 font-medium text-[#17212b]">{new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td><td className="px-4 py-3 text-emerald-700">{item.present}</td><td className="px-4 py-3 text-rose-700">{item.absent}</td><td className="px-4 py-3 font-medium text-[#17212b]">{item.percentage}%</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => { setDate(dateInputFromIso(item.date)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs font-semibold text-[#d9472e] hover:underline">Open</button></td></tr>)}</tbody></table></div></div>}
      </section>
    </div>
  );
}
