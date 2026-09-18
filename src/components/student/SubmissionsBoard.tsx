"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { TableToolbar, FilterChip } from "@/components/TableToolbar";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";

export type BoardSubmission = {
  id: string;
  title: string;
  status: "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "NEEDS_REVISION";
  createdAt: Date | string;
  feedbackCount: number;
};

const TABS = [
  { key: "ALL", label: "All" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "APPROVED", label: "Approved" },
  { key: "NEEDS_REVISION", label: "Needs Revision" },
] as const;

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function SubmissionsBoard({ submissions }: { submissions: BoardSubmission[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: submissions.length };
    for (const s of submissions) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [submissions]);

  const filtered = submissions.filter((s) => {
    if (tab !== "ALL" && s.status !== tab) return false;
    if (search.trim() && !s.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <FilterChip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label} {counts[t.key] !== undefined ? `(${counts[t.key]})` : "(0)"}
            </FilterChip>
          ))}
        </div>
        <LinkButton href="/student/submissions/new" size="sm" className="!bg-[#6b1029] hover:!bg-[#7c1638]">
          <Plus size={14} /> New Submission
        </LinkButton>
      </div>

      <Card className="overflow-hidden">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search submissions…" />
        {filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="No submissions found" description="Try a different filter or create a new submission." />
        ) : (
          <Table>
            <THead>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Submitted On</Th>
              <Th>Feedback</Th>
              <Th></Th>
            </THead>
            <TBody>
              {filtered.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium text-zinc-900">{s.title}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td className="text-zinc-500">{fmtDate(s.createdAt)}</Td>
                  <Td className="text-zinc-500">{s.feedbackCount > 0 ? `${s.feedbackCount} comment(s)` : "-"}</Td>
                  <Td>
                    <Link href={`/student/submissions/${s.id}`} className="text-xs font-medium text-[#6b1029] hover:underline">
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
