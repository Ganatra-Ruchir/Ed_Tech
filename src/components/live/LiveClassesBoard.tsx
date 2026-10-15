"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Copy, PlayCircle, Radio, Trash2, Video, XCircle } from "lucide-react";
import type { LiveClassListItem } from "@/lib/live/queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function icsFor(c: LiveClassListItem) {
  const start = new Date(c.scheduledAt);
  const end = new Date(start.getTime() + c.durationMinutes * 60000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = `${window.location.origin}/live/${c.id}`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Silver Oak Learning Hub//Live classes//EN",
    "BEGIN:VEVENT",
    `UID:${c.id}@learning-hub`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${c.title.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:Live class for ${c.batchName}. Join: ${url}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Live class starts in 10 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  a.download = `${c.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  a.click();
}

function localInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LiveClassesBoard({
  classes,
  batches,
  canSchedule,
  detailBase,
  configured,
}: {
  classes: LiveClassListItem[];
  batches: { id: string; name: string }[];
  canSchedule: boolean;
  /** e.g. "/faculty/live-classes" — hosts get a details link per class. */
  detailBase: string | null;
  configured: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [defaultStart] = useState(() => {
    const d = new Date(Date.now() + 60 * 60000);
    d.setMinutes(0, 0, 0);
    return localInputValue(d);
  });
  const [now] = useState(() => Date.now());

  const live = classes.filter((c) => c.status === "LIVE");
  const upcoming = classes.filter((c) => c.status === "SCHEDULED");
  const past = classes.filter((c) => c.status === "ENDED" || c.status === "CANCELLED").reverse();

  async function schedule(form: FormData) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/live-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: form.get("batchId"),
        title: form.get("title"),
        description: form.get("description") || null,
        scheduledAt: new Date(String(form.get("scheduledAt"))).toISOString(),
        durationMinutes: Number(form.get("durationMinutes")),
        waitingRoom: form.get("waitingRoom") === "on",
        muteOnEntry: form.get("muteOnEntry") === "on",
        allowStudentScreenShare: form.get("allowStudentScreenShare") === "on",
        autoRecord: form.get("autoRecord") === "on",
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Couldn't schedule the class.");
      return;
    }
    setShowForm(false);
    router.refresh();
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this class? Students will see it as cancelled.")) return;
    await fetch(`/api/live-classes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED" }) });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this class and its attendance, polls and Q&A?")) return;
    await fetch(`/api/live-classes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function copyLink(id: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/live/${id}`);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1500);
  }

  function renderRow(c: LiveClassListItem) {
    const startsSoon = c.status === "SCHEDULED" && new Date(c.scheduledAt).getTime() - now < 15 * 60000;
    return (
      <li key={c.id} className="flex flex-wrap items-center gap-3 border-t border-[#eceee9] px-4 py-3 first:border-t-0">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${c.status === "LIVE" ? "bg-rose-50 text-rose-600" : "bg-[#f4f1ee] text-[#8f3032]"}`}
        >
          {c.status === "LIVE" ? <Radio size={18} /> : <Video size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#17212b]">
            {c.title}
            {c.status === "CANCELLED" && <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">Cancelled</span>}
          </p>
          <p className="truncate text-[12px] text-[#667085]">
            {c.batchName}, with {c.hostName}. {c.status === "LIVE" ? "Live now" : fmt(c.scheduledAt)}, {c.durationMinutes} min
          </p>
          {c.recordings.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-2 text-[12px]">
              {c.recordings.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noreferrer" className="font-medium text-[#8f3032] underline">
                  Watch recording{c.recordings.length > 1 ? ` ${i + 1}` : ""}
                </a>
              ))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(c.status === "LIVE" || (c.status === "SCHEDULED" && (canSchedule || startsSoon))) && (
            <Link
              href={`/live/${c.id}`}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold text-white ${c.status === "LIVE" ? "bg-rose-600 hover:bg-rose-500" : "bg-[#17212b] hover:bg-[#263441]"}`}
            >
              <PlayCircle size={15} /> {c.status === "LIVE" ? "Join now" : canSchedule ? "Start class" : "Open"}
            </Link>
          )}
          {c.status === "SCHEDULED" && (
            <button type="button" onClick={() => icsFor(c)} className="lc-light-btn" title="Add to my calendar">
              <CalendarPlus size={15} />
            </button>
          )}
          {(c.status === "SCHEDULED" || c.status === "LIVE") && (
            <button type="button" onClick={() => copyLink(c.id)} className="lc-light-btn" title="Copy join link">
              {copied === c.id ? <span className="text-[11px] font-semibold">Copied</span> : <Copy size={15} />}
            </button>
          )}
          {detailBase && c.status !== "SCHEDULED" && (
            <Link href={`${detailBase}/${c.id}`} className="lc-light-btn px-2.5 text-[12px] font-semibold">
              Attendance & report
            </Link>
          )}
          {canSchedule && c.status === "SCHEDULED" && (
            <button type="button" onClick={() => cancel(c.id)} className="lc-light-btn" title="Cancel class">
              <XCircle size={15} />
            </button>
          )}
          {canSchedule && c.status !== "LIVE" && (
            <button type="button" onClick={() => remove(c.id)} className="lc-light-btn" title="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </li>
    );
  }

  function renderSection(title: string, items: LiveClassListItem[], empty: string) {
    return (
      <section className="overflow-hidden rounded-md border border-[#ebe5e1] bg-white">
        <h2 className="border-b border-[#ebe5e1] bg-[#faf8f6] px-4 py-2.5 text-[13px] font-semibold text-[#344054]">
          {title} <span className="font-normal text-[#98a2b3]">({items.length})</span>
        </h2>
        {items.length === 0 ? <p className="px-4 py-5 text-[13px] text-[#98a2b3]">{empty}</p> : <ul>{items.map(renderRow)}</ul>}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {!configured && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Live video isn&apos;t connected yet. You can schedule classes now; to run them, an administrator needs to add the LiveKit keys described in
          LIVE_CLASSES.md.
        </p>
      )}

      {canSchedule && (
        <div>
          {!showForm ? (
            <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-[#8f3032] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#74272a]">
              <Video size={16} /> Schedule a live class
            </button>
          ) : (
            <form action={schedule} className="grid gap-3 rounded-md border border-[#ebe5e1] bg-white p-4 sm:grid-cols-2">
              <label className="lc-field sm:col-span-2">
                Title
                <input name="title" required maxLength={200} placeholder="e.g. Data Structures: Trees revision" />
              </label>
              <label className="lc-field">
                Batch
                <select name="batchId" required>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lc-field">
                Starts at
                <input type="datetime-local" name="scheduledAt" required defaultValue={defaultStart} />
              </label>
              <label className="lc-field">
                Duration (minutes)
                <input type="number" name="durationMinutes" min={10} max={600} defaultValue={60} required />
              </label>
              <label className="lc-field sm:col-span-2">
                Description (optional)
                <textarea name="description" maxLength={2000} rows={2} placeholder="What students should prepare" />
              </label>
              <fieldset className="grid gap-2 text-[13px] text-[#344054] sm:col-span-2 sm:grid-cols-2">
                <label className="flex items-center gap-2"><input type="checkbox" name="waitingRoom" /> Waiting room</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="muteOnEntry" defaultChecked /> Mute students when they join</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="allowStudentScreenShare" /> Students can share their screen</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="autoRecord" /> Record automatically</label>
              </fieldset>
              {error && <p className="text-[13px] text-rose-600 sm:col-span-2">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" disabled={saving} className="rounded-md bg-[#8f3032] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                  {saving ? "Scheduling…" : "Schedule class"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-[#d6dbd3] px-4 py-2 text-[13px] font-semibold text-[#344054]">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {live.length > 0 && renderSection("Live now", live, "")}
      {renderSection("Upcoming", upcoming, canSchedule ? "Schedule a class and it will appear here." : "No live classes scheduled for your batches.")}
      {renderSection("Past classes", past, "Finished classes and their recordings appear here.")}
    </div>
  );
}
