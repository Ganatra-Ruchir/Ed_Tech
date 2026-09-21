"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/Button";

export function StaffAttendanceSettingsControl({ officeStartTime }: { officeStartTime: string }) {
  const router = useRouter();
  const [value, setValue] = useState(officeStartTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== officeStartTime;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff-attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeStartTime: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-600 shadow-sm">
        <Settings2 size={14} className="text-[#ef5b3f]" />
        <span className="text-zinc-500">Office starts</span>
        <input
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="cursor-pointer bg-transparent text-[13px] font-medium text-zinc-800 focus:outline-none"
        />
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </label>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
