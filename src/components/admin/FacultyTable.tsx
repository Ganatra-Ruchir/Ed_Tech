"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Star } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Tag } from "@/components/Tag";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { Pagination } from "@/components/admin/Pagination";
import { fmtDate } from "@/components/admin/format";
import {
  AdminFilterChip,
  AdminSearchInput,
  AdminSelect,
  AdminToolbar,
} from "@/components/admin/TableControls";
import type { FacultyRow } from "@/components/admin/types";
import { EditUserDialog } from "@/components/admin/EditUserDialog";

const PAGE_SIZE = 10;

export function FacultyTable({ faculty, departments }: { faculty: FacultyRow[]; departments: string[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [ccOnly, setCcOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faculty.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q) && !f.email.toLowerCase().includes(q)) return false;
      if (department && !f.departments.includes(department)) return false;
      if (ccOnly && !f.isCC) return false;
      return true;
    });
  }, [faculty, search, department, ccOnly]);

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
          placeholder="Search faculty by name or email…"
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
        <AdminFilterChip
          active={ccOnly}
          onClick={() => {
            setCcOnly((v) => !v);
            setPage(1);
          }}
        >
          Course coordinators
        </AdminFilterChip>
      </AdminToolbar>

      {filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No faculty match these filters" />
      ) : (
        <>
          <Table>
            <THead>
              <Th className="w-10">#</Th>
              <Th>Faculty member</Th>
              <Th>Assigned batches</Th>
              <Th>Role</Th>
              <Th>Tests created</Th>
              <Th>Feedback given</Th>
              <Th>Announcements</Th>
              <Th>Joined</Th>
              <Th className="text-right">Edit</Th>
            </THead>
            <TBody>
              {visible.map((f, i) => (
                <Tr key={f.id}>
                  <Td className="text-zinc-400">{(currentPage - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={f.name} size="sm" imageUrl={f.profileImageUrl} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-zinc-900">{f.name}</p>
                        <p className="truncate text-[11px] text-zinc-400">{f.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {f.batches.length === 0 ? (
                      <span className="text-zinc-400">Not assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {f.batches.map((b) => (
                          <Tag key={b} label={b} />
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {f.isCC ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#ef5b3f]/[0.08] px-2.5 py-0.5 text-xs font-medium text-[#ef5b3f]">
                        <Star size={11} /> Course coordinator
                      </span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                        Faculty
                      </span>
                    )}
                  </Td>
                  <Td>{f.testsCreated}</Td>
                  <Td>{f.feedbackGiven}</Td>
                  <Td>{f.announcements}</Td>
                  <Td className="whitespace-nowrap text-zinc-500">{fmtDate(f.joinedAt)}</Td>
                  <Td className="text-right"><EditUserDialog user={f} role="FACULTY" /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="faculty members"
          />
        </>
      )}
    </div>
  );
}
