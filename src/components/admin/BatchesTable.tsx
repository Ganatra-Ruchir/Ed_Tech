"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { Pagination } from "@/components/admin/Pagination";
import { AdminSearchInput, AdminSelect, AdminToolbar } from "@/components/admin/TableControls";
import type { BatchRow } from "@/components/admin/types";

const PAGE_SIZE = 10;

export function BatchesTable({
  batches,
  departments,
  semesters,
}: {
  batches: BatchRow[];
  departments: string[];
  semesters: string[];
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q) && !b.department.toLowerCase().includes(q)) return false;
      if (department && b.department !== department) return false;
      if (semester && b.semester !== semester) return false;
      return true;
    });
  }, [batches, search, department, semester]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.02]">
      <AdminToolbar>
        <AdminSearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search batches…"
        />
        <AdminSelect
          value={department}
          onChange={(v) => {
            setDepartment(v);
            setPage(1);
          }}
          options={departments}
          allLabel="All departments"
        />
        <AdminSelect
          value={semester}
          onChange={(v) => {
            setSemester(v);
            setPage(1);
          }}
          options={semesters}
          allLabel="All semesters"
        />
      </AdminToolbar>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No batches match these filters" />
      ) : (
        <>
          <Table>
            <THead>
              <Th className="w-10">#</Th>
              <Th>Batch</Th>
              <Th>Department</Th>
              <Th>Semester</Th>
              <Th>Students</Th>
              <Th>Faculty</Th>
              <Th>Tests</Th>
              <Th>Submissions</Th>
              <Th>Completion</Th>
              <Th>Avg score</Th>
              <Th>At risk</Th>
              <Th></Th>
            </THead>
            <TBody>
              {visible.map((b, i) => (
                <Tr key={b.id}>
                  <Td className="text-zinc-400">{(currentPage - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td>
                    <Link href={`/admin/batches/${b.id}`} className="font-medium text-zinc-900 hover:underline">
                      {b.name}
                    </Link>
                  </Td>
                  <Td className="text-zinc-500">{b.department}</Td>
                  <Td className="text-zinc-500">{b.semester}</Td>
                  <Td>{b.studentCount}</Td>
                  <Td>{b.facultyCount}</Td>
                  <Td>{b.testCount}</Td>
                  <Td>{b.submissionCount}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-zinc-700">{Math.round(b.completionRate)}%</span>
                      <ProgressBar value={b.completionRate} tone="auto" className="w-14" />
                    </div>
                  </Td>
                  <Td className="text-zinc-500">{Math.round(b.avgScorePct)}%</Td>
                  <Td className={b.atRiskCount > 0 ? "font-medium text-rose-600" : "text-zinc-500"}>
                    {b.atRiskCount}
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/batches/${b.id}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#6b1029] hover:underline"
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
            noun="batches"
          />
        </>
      )}
    </div>
  );
}
