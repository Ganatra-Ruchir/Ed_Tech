"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRightLeft, CalendarClock, CheckCircle2, Clock3, LoaderCircle, Mail, UserRound, XCircle } from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { leaveDayCount, type LeaveRequestDTO, type LeaveStatus } from "@/lib/leave-requests";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_META: Record<LeaveStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700", icon: Clock3 },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", className: "bg-rose-50 text-rose-700", icon: XCircle },
};

export function AdminLeaveRequests({ initialRequests }: { initialRequests: LeaveRequestDTO[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<"ALL" | LeaveStatus>("PENDING");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const counts = useMemo(() => ({
    PENDING: requests.filter((request) => request.status === "PENDING").length,
    APPROVED: requests.filter((request) => request.status === "APPROVED").length,
    REJECTED: requests.filter((request) => request.status === "REJECTED").length,
  }), [requests]);
  const visible = filter === "ALL" ? requests : requests.filter((request) => request.status === filter);

  async function reviewRequest(id: string, status: "APPROVED" | "REJECTED") {
    setReviewingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: notes[id] ?? "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not review leave request");
      setRequests((current) => current.map((request) => request.id === id ? data.request : request));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not review leave request");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Faculty Leave Requests" icon={CalendarClock} description="Review faculty leave requests and record an approval decision." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStatCard label="Pending requests" value={String(counts.PENDING)} icon={Clock3} tone="amber" footnote="Awaiting review" />
        <AdminStatCard label="Approved requests" value={String(counts.APPROVED)} icon={CheckCircle2} tone="emerald" footnote="Processed requests" />
        <AdminStatCard label="Rejected requests" value={String(counts.REJECTED)} icon={XCircle} tone="maroon" footnote="Declined requests" />
        <AdminStatCard label="Total requests" value={String(requests.length)} icon={UserRound} tone="violet" footnote="All statuses" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe3dc] pb-3">
        <div className="inline-flex rounded-md border border-[#d6dbd3] bg-white p-1">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${filter === value ? "bg-[#17212b] text-white" : "text-[#667085] hover:bg-[#f4f5f0]"}`}>{value === "ALL" ? "All" : STATUS_META[value].label}</button>)}
        </div>
        {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      </div>

      {visible.length === 0 ? <div className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-14 text-center"><CalendarClock className="mx-auto text-[#98a2b3]" size={24} /><p className="mt-3 text-sm font-medium text-[#475467]">No {filter === "ALL" ? "" : filter.toLowerCase()} leave requests</p></div> : <div className="space-y-3">{visible.map((request, index) => {
        const meta = STATUS_META[request.status];
        const StatusIcon = meta.icon;
        const reviewing = reviewingId === request.id;
        return <motion.article key={request.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.2) }} className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f1f3ef] text-[#475467]"><UserRound size={15} /></span><div><h2 className="text-sm font-semibold text-[#17212b]">{request.facultyName}</h2><p className="flex items-center gap-1 text-[11px] text-[#667085]"><Mail size={11} /> {request.facultyEmail}</p></div></div></div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}><StatusIcon size={13} />{meta.label}</span>
          </div>
          <div className="mt-4 grid gap-3 border-y border-[#eceee9] py-3 sm:grid-cols-3">
            <div><p className="text-[10px] font-semibold uppercase text-[#98a2b3]">Leave dates</p><p className="mt-1 text-sm font-medium text-[#17212b]">{formatDate(request.startDate)}{request.endDate !== request.startDate && ` - ${formatDate(request.endDate)}`}</p></div>
            <div><p className="text-[10px] font-semibold uppercase text-[#98a2b3]">Duration</p><p className="mt-1 text-sm font-medium text-[#17212b]">{leaveDayCount(request.startDate, request.endDate)} calendar day{leaveDayCount(request.startDate, request.endDate) === 1 ? "" : "s"}</p></div>
            <div><p className="text-[10px] font-semibold uppercase text-[#98a2b3]">Requested</p><p className="mt-1 text-sm font-medium text-[#17212b]">{new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
          </div>
          <div className="mt-4"><p className="text-[10px] font-semibold uppercase text-[#98a2b3]">Reason</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#344054]">{request.reason}</p></div>
          {request.handoverFacultyName && <div className="mt-4 rounded-md border border-sky-100 bg-sky-50/70 px-3 py-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800"><ArrowRightLeft size={13} /> Handover to {request.handoverFacultyName}</p>{request.handoverNotes && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-sky-900/75">{request.handoverNotes}</p>}</div>}
          {request.status === "PENDING" ? <div className="mt-4"><Textarea aria-label={`Administrator note for ${request.facultyName}`} rows={2} maxLength={1000} placeholder="Optional note for the faculty member..." value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} /><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" disabled={reviewing} onClick={() => reviewRequest(request.id, "REJECTED")}><XCircle size={14} /> Reject</Button><Button type="button" size="sm" disabled={reviewing} onClick={() => reviewRequest(request.id, "APPROVED")}>{reviewing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve</Button></div></div> : <div className="mt-4 rounded-md bg-[#f7f8f5] px-3 py-2 text-xs text-[#667085]">Reviewed by {request.reviewerName ?? "an administrator"}{request.reviewedAt ? ` on ${new Date(request.reviewedAt).toLocaleDateString("en-IN")}` : ""}{request.adminNote && <p className="mt-1 text-sm text-[#344054]">{request.adminNote}</p>}</div>}
        </motion.article>;
      })}</div>}
    </div>
  );
}
