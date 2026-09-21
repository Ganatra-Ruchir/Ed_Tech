"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Megaphone, Pin, CheckSquare, MessageSquare } from "lucide-react";
import { Card } from "@/components/Card";
import { Select, Input, Textarea } from "@/components/Field";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/announcement-types";
import { validateDocumentUpload, DOCUMENT_ACCEPT } from "@/lib/uploads";

function Toggle({
  on, onClick, icon: Icon, label,
}: {
  on: boolean; onClick: () => void; icon: typeof Pin; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        on ? "border-[#ef5b3f]/30 bg-[#ef5b3f]/[0.06] text-[#ef5b3f]" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50",
      )}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

export function AnnouncementComposer({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [category, setCategory] = useState<string>("GENERAL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [requireAck, setRequireAck] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!batchId || !title.trim() || !body.trim()) {
      setError("Batch, title, and message are all required.");
      return;
    }
    if (file) {
      const err = validateDocumentUpload({ name: file.name, size: file.size });
      if (err) { setError(err); return; }
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("batchId", batchId);
      fd.set("category", category);
      fd.set("title", title);
      fd.set("body", body);
      fd.set("pinned", String(pinned));
      fd.set("requireAck", String(requireAck));
      fd.set("allowComments", String(allowComments));
      if (file) fd.set("file", file);
      const res = await fetch("/api/announcements", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post announcement"); return; }
      setTitle(""); setBody(""); setFile(null); setPinned(false); setRequireAck(false);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
          <Megaphone size={15} className="text-[#ef5b3f]" /> New announcement
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Write an update for the class…" />

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:border-[#ef5b3f]/40">
          <FileUp size={14} className="text-[#ef5b3f]" />
          <span className="truncate">{file?.name ?? "Attach a file (PDF, DOC, image, zip… up to 25 MB)"}</span>
          <input ref={fileRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Toggle on={pinned} onClick={() => setPinned((v) => !v)} icon={Pin} label="Pin to top" />
          <Toggle on={requireAck} onClick={() => setRequireAck((v) => !v)} icon={CheckSquare} label="Require acknowledgment" />
          <Toggle on={allowComments} onClick={() => setAllowComments((v) => !v)} icon={MessageSquare} label="Allow replies" />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={submitting} size="sm" className="!bg-[#ef5b3f] hover:!bg-[#d9472e]">
          {submitting ? "Posting…" : "Post to class stream"}
        </Button>
      </form>
    </Card>
  );
}
