"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";

/** Copies live attendance into the batch's attendance register. */
export function SyncAttendanceButton({ classId }: { classId: string }) {
  const [minPercent, setMinPercent] = useState(50);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-[12px] text-[#475467]">
      Present if attended at least
      <input
        type="number"
        min={0}
        max={100}
        value={minPercent}
        onChange={(e) => setMinPercent(Number(e.target.value))}
        className="w-14 rounded border border-[#d6dbd3] px-1.5 py-1"
      />
      %
      <button
        type="button"
        disabled={busy}
        className="lc-light-btn gap-1.5 px-3 font-semibold"
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/live-classes/${classId}/attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minPercent }),
          });
          const data = await res.json().catch(() => ({}));
          setBusy(false);
          setResult(res.ok ? `Marked ${data.present} of ${data.total} present` : data.error ?? "Couldn't update the register");
        }}
      >
        <ClipboardCheck size={14} /> Mark in attendance register
      </button>
      {result && <span className="font-medium text-[#0b7a50]">{result}</span>}
    </span>
  );
}
