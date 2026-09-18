"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { relativeTime, statusLabel, SUBMISSION_STATUSES } from "@/components/faculty/faculty-format";

export type QueueItem = {
  id: string;
  kind: "submission" | "grading";
  title: string;
  studentName: string;
  batchId: string;
  batchName: string;
  /** ISO string — serialized by the server page. */
  date: string | null;
  status: string | null;
  href: string;
};

const PAGE_SIZE = 10;

const CHIP_DOT: Record<string, string> = {
  ALL: "bg-zinc-400",
  SUBMITTED: "bg-indigo-500",
  IN_REVIEW: "bg-amber-500",
  NEEDS_REVISION: "bg-rose-500",
  APPROVED: "bg-emerald-500",
  GRADING: "bg-violet-500",
};

function Chip({
  active,
  dot,
  onClick,
  children,
}: {
  active: boolean;
  dot: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-[#6b1029] text-white"
          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white/80" : dot)} />
      {children}
    </button>
  );
}

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}

const selectClass =
  "appearance-none rounded-md border border-zinc-200 bg-white py-1.5 pl-2.5 pr-7 text-[12.5px] text-zinc-700 focus:border-[#6b1029]/40 focus:outline-none focus:ring-2 focus:ring-[#6b1029]/10";

export function ReviewQueueBoard({
  items,
  batches,
  /** Server-rendered "now", so the first paint matches the client's. */
  nowMs,
}: {
  items: QueueItem[];
  batches: { id: string; name: string }[];
  nowMs: number;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [batchFilter, setBatchFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projects = useMemo(
    () => [...new Set(items.map((i) => i.title))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { ALL: items.length, GRADING: 0 };
    for (const status of SUBMISSION_STATUSES) byStatus[status] = 0;
    for (const item of items) {
      if (item.kind === "grading") byStatus.GRADING += 1;
      else if (item.status) byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    return byStatus;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = items.filter((item) => {
      if (statusFilter === "GRADING" && item.kind !== "grading") return false;
      if (statusFilter !== "ALL" && statusFilter !== "GRADING" && item.status !== statusFilter) return false;
      if (batchFilter && item.batchId !== batchFilter) return false;
      if (projectFilter && item.title !== projectFilter) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.studentName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    return rows.sort((a, b) => {
      const at = a.date ? new Date(a.date).getTime() : 0;
      const bt = b.date ? new Date(b.date).getTime() : 0;
      return sort === "newest" ? bt - at : at - bt;
    });
  }, [items, statusFilter, batchFilter, projectFilter, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function resetTo(fn: () => void) {
    fn();
    setPage(1);
    setSelected([]);
  }

  const selectableOnPage = visible.filter((i) => i.kind === "submission").map((i) => i.id);
  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((id) => selected.includes(id));

  async function bulkSetInReview() {
    if (selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const responses = await Promise.all(
        selected.map((id) =>
          fetch(`/api/submissions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "IN_REVIEW" }),
          }),
        ),
      );
      const failed = responses.filter((r) => !r.ok).length;
      if (failed > 0) setError(`${failed} of ${selected.length} could not be updated.`);
      setSelected([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={statusFilter === "ALL"} dot={CHIP_DOT.ALL} onClick={() => resetTo(() => setStatusFilter("ALL"))}>
          All ({counts.ALL})
        </Chip>
        {SUBMISSION_STATUSES.map((status) => (
          <Chip
            key={status}
            active={statusFilter === status}
            dot={CHIP_DOT[status]}
            onClick={() => resetTo(() => setStatusFilter(status))}
          >
            {statusLabel(status)} ({counts[status]})
          </Chip>
        ))}
        {counts.GRADING > 0 && (
          <Chip
            active={statusFilter === "GRADING"}
            dot={CHIP_DOT.GRADING}
            onClick={() => resetTo(() => setStatusFilter("GRADING"))}
          >
            Test Grading ({counts.GRADING})
          </Chip>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
          <SelectShell>
            <select
              value={batchFilter}
              onChange={(e) => resetTo(() => setBatchFilter(e.target.value))}
              className={selectClass}
            >
              <option value="">Batch: All</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </SelectShell>

          <SelectShell>
            <select
              value={projectFilter}
              onChange={(e) => resetTo(() => setProjectFilter(e.target.value))}
              className={cn(selectClass, "max-w-[190px]")}
            >
              <option value="">Project: All</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </SelectShell>

          <div className="relative min-w-[170px] flex-1 sm:max-w-xs">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => resetTo(() => setSearch(e.target.value))}
              placeholder="Search student or project…"
              className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#6b1029]/40 focus:outline-none focus:ring-2 focus:ring-[#6b1029]/10"
            />
          </div>

          <button
            onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <ArrowUpDown size={13} /> Sort: {sort === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-[#6b1029]/[0.04] px-3 py-2">
            <p className="text-xs font-medium text-[#6b1029]">{selected.length} selected</p>
            <button
              onClick={bulkSetInReview}
              disabled={busy}
              className="rounded-md bg-[#6b1029] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#7c1638] disabled:opacity-50"
            >
              {busy ? "Updating…" : "Mark in review"}
            </button>
            <button
              onClick={() => setSelected([])}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              Clear
            </button>
            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing to review here"
            description={items.length === 0 ? "The queue is clear." : "No items match these filters."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/95 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="w-9 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={allOnPageSelected}
                      disabled={selectableOnPage.length === 0}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...new Set([...selected, ...selectableOnPage])]
                            : selected.filter((id) => !selectableOnPage.includes(id)),
                        )
                      }
                      className="h-3.5 w-3.5 rounded border-zinc-300 accent-[#6b1029]"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">Student</th>
                  <th className="px-3 py-2.5 font-medium">Project / Test</th>
                  <th className="px-3 py-2.5 font-medium">Batch</th>
                  <th className="px-3 py-2.5 font-medium">Submitted</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={`${item.kind}-${item.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.title}`}
                        disabled={item.kind !== "submission"}
                        checked={selected.includes(item.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, item.id]
                              : selected.filter((id) => id !== item.id),
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-zinc-300 accent-[#6b1029] disabled:opacity-30"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <Avatar name={item.studentName} size="sm" />
                        <span className="truncate text-[13px] font-medium text-zinc-900">{item.studentName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-zinc-700">{item.title}</td>
                    <td className="px-3 py-2.5 text-[13px] text-zinc-500">{item.batchName}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-zinc-500">
                      {relativeTime(item.date, nowMs)}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.status ? (
                        <StatusBadge status={item.status} />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                          Needs Grading
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 rounded-md border border-[#6b1029]/20 bg-[#6b1029]/[0.06] px-2.5 py-1 text-xs font-medium text-[#6b1029] transition-colors hover:bg-[#6b1029] hover:text-white"
                      >
                        {item.kind === "submission" ? "Review" : "Grade"} <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2.5">
            <p className="text-[12px] text-zinc-500">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-0.5 text-xs text-zinc-300">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        "h-7 min-w-7 rounded-md px-2 text-xs font-medium",
                        p === currentPage
                          ? "bg-[#6b1029] text-white"
                          : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50",
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                aria-label="Next page"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
