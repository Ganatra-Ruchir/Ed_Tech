"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, LogIn, LogOut } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

type Student = { id: string; name: string; email: string };
type RecordItem = { studentId: string; status: string; checkedInAt: string | null; checkedOutAt: string | null };

export function AttendanceManager({ batchId, students }: { batchId: string; students: Student[] }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/attendance?batchId=${batchId}&date=${date}`);
    const data = await response.json();
    if (response.ok) setRecords(data.records ?? []);
    else setError(data.error ?? "Could not load attendance");
  }

  useEffect(() => { void load(); }, [batchId, date]);

  async function update(studentId: string, action: "check_in" | "check_out" | "absent" | "present") {
    const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId, studentId, action, date }) });
    if (!response.ok) setError((await response.json()).error ?? "Could not update attendance");
    else await load();
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900"><CalendarCheck size={15} className="text-[#6b1029]" /> Check-in / Check-out</h2><p className="mt-0.5 text-xs text-zinc-500">Record attendance for this batch.</p></div>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs" />
      </div>
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
      {students.length === 0 ? <p className="text-sm text-zinc-500">Add students to the batch before taking attendance.</p> : <ul className="divide-y divide-zinc-100">{students.map((student) => { const record = records.find((item) => item.studentId === student.id); return <li key={student.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-zinc-900">{student.name}</span><span className="block text-[11px] text-zinc-400">{record?.status ?? "Not marked"}{record?.checkedInAt ? ` · In ${new Date(record.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}{record?.checkedOutAt ? ` · Out ${new Date(record.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span></span><Button size="sm" variant="secondary" onClick={() => update(student.id, "check_in")}><LogIn size={13} /> In</Button><Button size="sm" variant="secondary" onClick={() => update(student.id, "check_out")}><LogOut size={13} /> Out</Button><Button size="sm" variant={record?.status === "ABSENT" ? "danger" : "ghost"} onClick={() => update(student.id, record?.status === "ABSENT" ? "present" : "absent")}>{record?.status === "ABSENT" ? "Absent" : "Mark absent"}</Button></li>; })}</ul>}
    </Card>
  );
}