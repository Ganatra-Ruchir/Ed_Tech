"use client";

import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { Pagination } from "@/components/admin/Pagination";
import { fmtDateTime, humanizeAction } from "@/components/admin/format";
import { AdminSearchInput, AdminSelect, AdminToolbar } from "@/components/admin/TableControls";
import type { AuditRow } from "@/components/admin/types";

const PAGE_SIZE = 12;

function summarizeMetadata(metadata: string | null): string {
  if (!metadata) return "-";
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (parsed && typeof parsed === "object") {
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length === 0) return "-";
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ");
    }
    return String(parsed);
  } catch {
    return metadata;
  }
}

export function AuditLogTable({
  logs,
  actions,
  entityTypes,
}: {
  logs: AuditRow[];
  actions: string[];
  entityTypes: string[];
}) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

    return logs.filter((l) => {
      if (action && l.action !== action) return false;
      if (entityType && l.entityType !== entityType) return false;
      const at = new Date(l.createdAt).getTime();
      if (fromMs !== null && at < fromMs) return false;
      if (toMs !== null && at > toMs) return false;
      if (q) {
        const haystack = `${l.actorName} ${l.action} ${l.entityType} ${l.entityId} ${l.metadata ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, action, entityType, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const dateInputClass =
    "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12.5px] text-zinc-700 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.02]">
      <AdminToolbar>
        <AdminSearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search logs…"
        />
        <AdminSelect
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={actions}
          allLabel="All actions"
        />
        <AdminSelect
          value={entityType}
          onChange={(v) => {
            setEntityType(v);
            setPage(1);
          }}
          options={entityTypes}
          allLabel="All entities"
        />
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={dateInputClass}
          />
          <span className="text-[11px] text-zinc-400">to</span>
          <input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={dateInputClass}
          />
        </div>
      </AdminToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries match these filters"
          description="Entries are written whenever a review, grading or report action is recorded."
        />
      ) : (
        <>
          <Table>
            <THead>
              <Th className="w-10">#</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Details</Th>
              <Th>Date &amp; time</Th>
            </THead>
            <TBody>
              {visible.map((l, i) => (
                <Tr key={l.id}>
                  <Td className="text-zinc-400">{(currentPage - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={l.actorName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-zinc-900">{l.actorName}</p>
                        <p className="truncate text-[11px] capitalize text-zinc-400">{l.actorRole.toLowerCase()}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-medium text-zinc-800">{humanizeAction(l.action)}</Td>
                  <Td>
                    <span className="inline-flex whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {l.entityType}
                    </span>
                    <span className="ml-1.5 font-mono text-[11px] text-zinc-400">{l.entityId.slice(0, 8)}</span>
                  </Td>
                  <Td className="max-w-[240px] truncate text-zinc-500" >{summarizeMetadata(l.metadata)}</Td>
                  <Td className="whitespace-nowrap text-zinc-500">{fmtDateTime(l.createdAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="log entries"
          />
        </>
      )}
    </div>
  );
}
