"use client";

import { useState } from "react";
import { Clock, LogIn, LogOut, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { formatClock, type FacultyAttendanceStatusDTO, type StaffAttendanceRecordDTO } from "@/lib/staff-attendance-types";

function dayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Today";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function OfficeAttendanceCard({ initial }: { initial: FacultyAttendanceStatusDTO }) {
  const [status, setStatus] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  async function act(action: "check_in" | "check_out") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/faculty/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      const record = data.record as StaffAttendanceRecordDTO;
      setStatus((prev) => ({
        ...prev,
        today: record,
        recent: [record, ...prev.recent.filter((r) => r.date !== record.date)],
      }));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  const today = status.today;
  const history = status.recent.filter((r) => r.id !== today?.id).slice(0, 6);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#6b1029]/10 text-[#6b1029]">
            <Clock size={15} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-zinc-900">Office Attendance</p>
            <p className="text-[11.5px] text-zinc-500">
              {today?.checkInAt
                ? `Checked in at ${formatClock(today.checkInAt)}`
                : `Office hours start ${status.officeStartTime}`}
              {today?.checkOutAt ? ` · out ${formatClock(today.checkOutAt)}` : ""}
              {today?.isLate && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600">
                  <AlertTriangle size={10} /> Late
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!today?.checkInAt && (
            <Button size="sm" onClick={() => act("check_in")} disabled={pending}>
              <LogIn size={13} /> Check In
            </Button>
          )}
          {today?.checkInAt && !today?.checkOutAt && (
            <Button size="sm" variant="secondary" onClick={() => act("check_out")} disabled={pending}>
              <LogOut size={13} /> Check Out
            </Button>
          )}
          {today?.checkInAt && today?.checkOutAt && (
            <span className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-700">
              Done for today
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-[11.5px] text-rose-600"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
          {history.map((r) => (
            <span
              key={r.id}
              title={`In ${formatClock(r.checkInAt)} · Out ${formatClock(r.checkOutAt)}`}
              className={
                r.isLate
                  ? "rounded-md bg-amber-50 px-2 py-1 text-[10.5px] font-medium text-amber-700"
                  : "rounded-md bg-zinc-50 px-2 py-1 text-[10.5px] font-medium text-zinc-600"
              }
            >
              {dayLabel(r.date, todayIso)} · {formatClock(r.checkInAt)}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
