"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { Pagination } from "@/components/admin/Pagination";
import {
  AdminFilterChip,
  AdminSearchInput,
  AdminSelect,
  AdminToolbar,
  RiskPill,
} from "@/components/admin/TableControls";
import type { StudentRow } from "@/components/admin/types";

const PAGE_SIZE = 10;
type RiskFilter = "all" | "risk" | "ontrack";

export function StudentsTable({ students, batches }: { students: StudentRow[]; batches: string[] }) {
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      if (batch && !s.batches.includes(batch)) return false;
      if (risk === "risk" && !s.atRisk) return false;
      if (risk === "ontrack" && s.atRisk) return false;
      return true;
    });
  }, [students, search, batch, risk]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.02]">
      <AdminToolbar>
        <AdminSearchInput value={search} onChange={update(setSearch)} placeholder="Search by name or email…" />
        <AdminSelect value={batch} onChange={update(setBatch)} options={batches} allLabel="All batches" />
        <div className="flex items-center gap-1">
          <AdminFilterChip active={risk === "all"} onClick={() => update<RiskFilter>(setRisk)("all")}>
            All
          </AdminFilterChip>
          <AdminFilterChip active={risk === "ontrack"} onClick={() => update<RiskFilter>(setRisk)("ontrack")}>
            On track
          </AdminFilterChip>
          <AdminFilterChip active={risk === "risk"} onClick={() => update<RiskFilter>(setRisk)("risk")}>
            At risk
          </AdminFilterChip>
        </div>
      </AdminToolbar>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No students match these filters" description="Try clearing the search or batch filter." />
      ) : (
        <>
          <Table>
            <THead>
              <Th className="w-10">#</Th>
              <Th>Student</Th>
              <Th>Batch</Th>
              <Th>Submissions</Th>
              <Th>Completion</Th>
              <Th>Avg score</Th>
              <Th>Status</Th>
              <Th></Th>
            </THead>
            <TBody>
              {visible.map((s, i) => (
                <Tr key={s.id}>
                  <Td className="text-zinc-400">{(currentPage - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/admin/students/${s.id}`} className="block truncate text-[13px] font-medium text-zinc-900 hover:underline">
                          {s.name}
                        </Link>
                        <p className="truncate text-[11px] text-zinc-400">{s.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-zinc-500">{s.batches.length > 0 ? s.batches.join(", ") : "-"}</Td>
                  <Td>{s.submissionCount}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-zinc-700">{Math.round(s.completionRate)}%</span>
                      <ProgressBar value={s.completionRate} tone="auto" className="w-16" />
                    </div>
                  </Td>
                  <Td className="text-zinc-500">{s.hasTestData ? `${Math.round(s.avgScorePct)}%` : "-"}</Td>
                  <Td><RiskPill atRisk={s.atRisk} /></Td>
                  <Td>
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#ef5b3f] hover:underline"
                    >
                      View <ArrowRight size={12} />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="students"
          />
        </>
      )}
    </div>
  );
}
