"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  batchId: string;
  batchName: string;
  submissions: number;
  /** 0-100, or null when this student has no graded test responses yet. */
  avgScorePct: number | null;
  atRisk: boolean;
};

export function StudentsBoard({
  students,
  batches,
}: {
  students: StudentRow[];
  batches: { id: string; name: string }[];
}) {
  const [batchFilter, setBatchFilter] = useState("");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (batchFilter && s.batchId !== batchFilter) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, batchFilter, search]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
        <div className="relative">
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="appearance-none rounded-md border border-zinc-200 bg-white py-1.5 pl-2.5 pr-7 text-[12.5px] text-zinc-700 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10"
          >
            <option value="">Batch: All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>

        <div className="relative min-w-[190px] flex-1 sm:max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name or email…"
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10"
          />
        </div>

        <p className="ml-auto text-[12px] text-zinc-400">
          {rows.length} of {students.length} students
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={students.length === 0 ? "Add students to a batch roster first." : "Try a different filter."}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/95 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Batch</th>
                <th className="px-3 py-2.5 font-medium">Submissions</th>
                <th className="px-3 py-2.5 font-medium">Avg. Score</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-zinc-100 hover:bg-zinc-50/80">
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar name={s.name} size="sm" />
                      <span className="truncate text-[13px] font-medium text-zinc-900">{s.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-zinc-500">{s.email}</td>
                  <td className="px-3 py-2.5 text-[13px] text-zinc-500">{s.batchName}</td>
                  <td className="px-3 py-2.5 text-[13px] text-zinc-700">{s.submissions}</td>
                  <td className="px-3 py-2.5">
                    {s.avgScorePct === null ? (
                      <span className="text-[13px] text-zinc-400">—</span>
                    ) : (
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          s.avgScorePct >= 75
                            ? "text-emerald-600"
                            : s.avgScorePct >= 50
                              ? "text-amber-600"
                              : "text-rose-600",
                        )}
                      >
                        {s.avgScorePct.toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.atRisk ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> At Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/faculty/students/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#ef5b3f]/20 bg-[#ef5b3f]/[0.06] px-2.5 py-1 text-xs font-medium text-[#ef5b3f] transition-colors hover:bg-[#ef5b3f] hover:text-white"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
