"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Inbox, ClipboardCheck } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { TableToolbar, FilterChip } from "@/components/TableToolbar";
import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";

function fmtDate(d: Date | string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function daysAgo(d: Date | string | null): number {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

export type QueueSubmission = {
  id: string;
  title: string;
  status: string;
  createdAt: Date | string;
  student: { name: string };
  batch: { name: string };
};

export type QueueResponse = {
  id: string;
  submittedAt: Date | string | null;
  student: { name: string };
  test: { title: string; batch: { name: string } };
};

type QueueItem = {
  id: string;
  kind: "submission" | "grading";
  title: string;
  personName: string;
  batchName: string;
  date: Date | string | null;
  status?: string;
  href: string;
};

const KIND_META = {
  submission: { icon: Inbox, tone: "bg-amber-50 text-amber-600", accent: "bg-amber-400", label: "Submission" },
  grading: { icon: ClipboardCheck, tone: "bg-indigo-50 text-indigo-600", accent: "bg-indigo-400", label: "Grading" },
} as const;

export function ReviewQueueBoard({
  submissions,
  responses,
}: {
  submissions: QueueSubmission[];
  responses: QueueResponse[];
}) {
  const [kindFilter, setKindFilter] = useState<"all" | "submission" | "grading">("all");
  const [search, setSearch] = useState("");

  const items: QueueItem[] = useMemo(() => {
    const fromSubmissions: QueueItem[] = submissions.map((s) => ({
      id: s.id,
      kind: "submission",
      title: s.title,
      personName: s.student.name,
      batchName: s.batch.name,
      date: s.createdAt,
      status: s.status,
      href: `/faculty/submissions/${s.id}`,
    }));
    const fromResponses: QueueItem[] = responses.map((r) => ({
      id: r.id,
      kind: "grading",
      title: r.test.title,
      personName: r.student.name,
      batchName: r.test.batch.name,
      date: r.submittedAt,
      href: `/faculty/test-responses/${r.id}`,
    }));
    return [...fromSubmissions, ...fromResponses].sort((a, b) => {
      const at = a.date ? new Date(a.date).getTime() : 0;
      const bt = b.date ? new Date(b.date).getTime() : 0;
      return at - bt;
    });
  }, [submissions, responses]);

  const filtered = items.filter((item) => {
    if (kindFilter !== "all" && item.kind !== kindFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.personName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile icon={Inbox} tone="amber" value={submissions.length} label="Submissions awaiting review" />
        <StatTile icon={ClipboardCheck} tone="indigo" value={responses.length} label="Test responses needing grading" />
      </div>

      <Card className="overflow-hidden">
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by title or student…"
          filters={
            <>
              <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
                All ({items.length})
              </FilterChip>
              <FilterChip active={kindFilter === "submission"} onClick={() => setKindFilter("submission")}>
                Submissions ({submissions.length})
              </FilterChip>
              <FilterChip active={kindFilter === "grading"} onClick={() => setKindFilter("grading")}>
                Grading ({responses.length})
              </FilterChip>
            </>
          }
        />
        {filtered.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing here" description="Nice work — the queue is clear." />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {filtered.map((item) => {
              const meta = KIND_META[item.kind];
              const overdue = daysAgo(item.date) >= 5;
              return (
                <li key={`${item.kind}-${item.id}`} className="group relative flex items-center gap-3 py-2.5 pl-4 pr-4 transition-colors hover:bg-zinc-50/80">
                  <span className={cn("absolute left-0 top-0 h-full w-[2.5px]", meta.accent)} />
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", meta.tone)}>
                    <meta.icon size={14} />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={item.personName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-900">{item.title}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {item.personName} · {item.batchName} ·{" "}
                        <span className={overdue ? "font-medium text-rose-600" : undefined}>{fmtDate(item.date)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {item.status ? <StatusBadge status={item.status} /> : (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                        {meta.label}
                      </span>
                    )}
                    <LinkButton href={item.href} size="sm" variant="secondary" className="opacity-80 group-hover:opacity-100">
                      {item.kind === "submission" ? "Review" : "Grade"} <ArrowRight size={12} />
                    </LinkButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: typeof Inbox;
  tone: "amber" | "indigo";
  value: number;
  label: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-0.5",
          tone === "amber" ? "bg-amber-400" : "bg-indigo-500",
        )}
      />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600",
          )}
        >
          <Icon size={16} />
        </span>
        <div>
          <p className="text-xl font-semibold tracking-tight text-zinc-900">{value}</p>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}
