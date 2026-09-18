"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, ChevronDown, Check } from "lucide-react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";

type Scope = "student" | "batch";

const CONTENTS: Record<Scope, string[]> = {
  student: [
    "Progress KPIs — completion rate, average test score, review turnaround",
    "Every submission with its current review status",
    "Test results with per-test scores",
    "Evidence tags and faculty feedback log",
  ],
  batch: [
    "Batch KPIs — students, at-risk count, completion rate, average score",
    "Per-student completion rate and average score",
    "Submission counts broken down by status",
  ],
};

const selectClass =
  "w-full appearance-none rounded-md border border-zinc-200 bg-white py-2 pl-3 pr-8 text-[13px] text-zinc-900 focus:border-[#6b1029]/40 focus:outline-none focus:ring-2 focus:ring-[#6b1029]/10";

export function ReportGenerator({
  students,
  batches,
}: {
  students: { id: string; name: string; email: string; batchName: string }[];
  batches: { id: string; name: string; department: string; semester: string }[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("student");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const student = students.find((s) => s.id === studentId);
  const batch = batches.find((b) => b.id === batchId);
  const targetName = scope === "student" ? (student?.name ?? "—") : (batch?.name ?? "—");
  const targetMeta =
    scope === "student"
      ? (student?.batchName ?? "No batch")
      : batch
        ? `${batch.department} · ${batch.semester}`
        : "";
  const canGenerate = scope === "student" ? Boolean(studentId) : Boolean(batchId);

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope === "student" ? { scope, studentId } : { scope, batchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to generate report");
        return;
      }
      window.open(data.report.url, "_blank");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="p-4 lg:col-span-3">
        <h2 className="text-[13px] font-semibold text-zinc-900">Generate Report</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Create PDF reports for students or batches.</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["student", "batch"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                scope === s
                  ? "bg-[#6b1029] text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
            >
              {s === "student" ? "Student Report" : "Batch Report"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {scope === "student" ? (
            <div>
              <label htmlFor="report-student" className="mb-1 block text-xs font-medium text-zinc-600">
                Select Student
              </label>
              <div className="relative">
                <select
                  id="report-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className={selectClass}
                >
                  {students.length === 0 && <option value="">No students in your batches</option>}
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="report-batch" className="mb-1 block text-xs font-medium text-zinc-600">
                Select Batch
              </label>
              <div className="relative">
                <select
                  id="report-batch"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className={selectClass}
                >
                  {batches.length === 0 && <option value="">No batches assigned</option>}
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.semester}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-600">This report includes</p>
            <ul className="space-y-1.5">
              {CONTENTS[scope].map((line) => (
                <li key={line} className="flex items-start gap-1.5 text-xs text-zinc-500">
                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !canGenerate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#6b1029] px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#7c1638] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown size={15} /> {loading ? "Generating…" : "Generate PDF"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </Card>

      <div className="lg:col-span-2">
        <p className="mb-2 text-[13px] font-semibold text-zinc-900">Report Preview</p>
        <Card className="overflow-hidden p-0">
          <div className="aspect-[3/4] w-full bg-white p-6">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 40 40" className="h-7 w-7 shrink-0" aria-hidden="true">
                  <circle cx="20" cy="20" r="20" fill="#6b1029" />
                  <path
                    d="M20 8c-3.5 0-6 2.6-6 5.7 0 1.2.4 2.3 1.1 3.2-1.9.9-3.1 2.7-3.1 4.8 0 2.9 2.3 5.2 5.1 5.3v6.2h5.8v-6.2c2.8-.1 5.1-2.4 5.1-5.3 0-2.1-1.2-3.9-3.1-4.8.7-.9 1.1-2 1.1-3.2C26 10.6 23.5 8 20 8z"
                    fill="white"
                  />
                </svg>
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold text-[#6b1029]">Silver Oak University</p>
                  <p className="text-[8.5px] uppercase tracking-wide text-zinc-400">
                    Student Progress &amp; Evaluation
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {scope === "student" ? "Student Progress Report" : "Batch Summary Report"}
                </p>
                <p className="mt-1 text-[15px] font-bold text-zinc-900">{targetName}</p>
                <p className="text-[10.5px] text-zinc-500">{targetMeta}</p>
              </div>

              <div className="mt-5 space-y-1.5">
                {CONTENTS[scope].map((line) => (
                  <div key={line} className="h-1.5 rounded-full bg-zinc-100" style={{ width: `${70 + (line.length % 5) * 6}%` }} />
                ))}
                <div className="h-1.5 w-1/2 rounded-full bg-zinc-100" />
                <div className="h-1.5 w-3/5 rounded-full bg-zinc-100" />
              </div>

              <div className="mt-auto -mx-6 -mb-6 h-14" style={{ background: "linear-gradient(120deg, #6b1029 0%, #93213f 100%)" }} />
            </div>
          </div>
        </Card>
        <p className="mt-2 text-[11px] text-zinc-400">
          A rendered outline — the generated PDF contains the live figures listed on the left.
        </p>
      </div>
    </div>
  );
}
