"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRightLeft, CalendarClock, CheckCircle2, Clock3, LoaderCircle, Send, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Label, Select, Textarea } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { leaveDayCount, type LeaveRequestDTO, type LeaveStatus } from "@/lib/leave-requests";

function localDateInput(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_META: Record<LeaveStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  PENDING: { label: "Pending review", className: "bg-amber-50 text-amber-700", icon: Clock3 },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  REJECTED: { label: "Not approved", className: "bg-rose-50 text-rose-700", icon: XCircle },
};

export function FacultyLeaveRequests({ initialRequests, facultyOptions }: { initialRequests: LeaveRequestDTO[]; facultyOptions: { id: string; name: string; email: string }[] }) {
  const today = localDateInput();
  const [requests, setRequests] = useState(initialRequests);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverFacultyId, setHandoverFacultyId] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    if (handoverOpen && !handoverFacultyId) {
      setError("Select a faculty member for the handover.");
      setSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          reason,
          handoverFacultyId: handoverOpen ? handoverFacultyId : null,
          handoverNotes: handoverOpen ? handoverNotes : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not submit leave request");
      setRequests((current) => [data.request, ...current]);
      setReason("");
      setHandoverOpen(false);
      setHandoverFacultyId("");
      setHandoverNotes("");
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit leave request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leave requests" description="Request time away and track the administrator's decision." />

      <form onSubmit={submitRequest} className="rounded-md border border-[#dfe3dc] bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ef5b3f]/10 text-[#d9472e]"><CalendarClock size={18} /></span>
          <div><h2 className="text-sm font-semibold text-[#17212b]">Request leave</h2><p className="text-xs text-[#667085]">Your request will be sent to the administration for review.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Start date</Label><Input type="date" min={today} value={startDate} onChange={(event) => { setStartDate(event.target.value); if (event.target.value > endDate) setEndDate(event.target.value); }} required /></div>
          <div><Label>End date</Label><Input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></div>
        </div>
        <div className="mt-4"><Label>Reason</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1000} placeholder="Briefly explain the reason for your leave..." required /></div>
        <div className="mt-4">
          <button type="button" onClick={() => setHandoverOpen((open) => !open)} aria-expanded={handoverOpen} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${handoverOpen ? "border-[#ef5b3f]/30 bg-[#fff8f5] text-[#d9472e]" : "border-[#d6dbd3] text-[#475467] hover:bg-[#f7f8f5]"}`}><ArrowRightLeft size={14} />{handoverOpen ? "Remove handover" : "Add handover"}</button>
          {handoverOpen && <div className="mt-3 grid gap-4 rounded-md border border-[#e1e5de] bg-[#f8f9f6] p-4 sm:grid-cols-2">
            <div><Label>Hand over to</Label><Select value={handoverFacultyId} onChange={(event) => setHandoverFacultyId(event.target.value)} required><option value="">Select faculty member</option>{facultyOptions.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name} · {faculty.email}</option>)}</Select></div>
            <div className="sm:col-span-2"><Label>Handover instructions</Label><Textarea value={handoverNotes} onChange={(event) => setHandoverNotes(event.target.value)} rows={3} maxLength={1500} placeholder="Classes, tasks, deadlines, or materials that need attention..." /></div>
          </div>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>{error ? <p role="alert" className="text-xs text-rose-600">{error}</p> : success ? <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> Request submitted for review</p> : <p className="text-xs text-[#667085]">{leaveDayCount(startDate, endDate)} calendar day{leaveDayCount(startDate, endDate) === 1 ? "" : "s"}</p>}</div>
          <Button type="submit" disabled={submitting || reason.trim().length < 5}>{submitting ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}{submitting ? "Submitting..." : "Submit request"}</Button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#17212b]">Request history</h2>
        {requests.length === 0 ? <div className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-12 text-center text-sm text-[#667085]">You have not submitted any leave requests.</div> : <div className="space-y-3">{requests.map((request, index) => {
          const meta = STATUS_META[request.status];
          const StatusIcon = meta.icon;
          return <motion.article key={request.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.2) }} className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-sm font-semibold text-[#17212b]">{formatDate(request.startDate)}{request.endDate !== request.startDate && ` - ${formatDate(request.endDate)}`}</p><p className="mt-1 text-xs text-[#667085]">{leaveDayCount(request.startDate, request.endDate)} calendar day{leaveDayCount(request.startDate, request.endDate) === 1 ? "" : "s"} · Requested {new Date(request.createdAt).toLocaleDateString("en-IN")}</p></div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}><StatusIcon size={13} />{meta.label}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#344054]">{request.reason}</p>
            {request.handoverFacultyName && <div className="mt-4 rounded-md border border-sky-100 bg-sky-50/70 px-3 py-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800"><UserRound size={13} /> Handed over to {request.handoverFacultyName}</p>{request.handoverNotes && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-sky-900/75">{request.handoverNotes}</p>}</div>}
            {request.adminNote && <div className="mt-4 border-l-2 border-[#ef5b3f] bg-[#fff8f5] px-3 py-2"><p className="text-[11px] font-semibold uppercase text-[#d9472e]">Administrator note</p><p className="mt-1 text-sm text-[#475467]">{request.adminNote}</p></div>}
          </motion.article>;
        })}</div>}
      </section>
    </div>
  );
}
