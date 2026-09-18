"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Megaphone } from "lucide-react";
import { Card } from "@/components/Card";
import { Select, Input, Textarea } from "@/components/Field";
import { Button } from "@/components/Button";

export function AnnouncementComposer({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("batchId", batchId); formData.set("title", title); formData.set("body", body);
      if (file) formData.set("file", file);
      const res = await fetch("/api/announcements", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post announcement");
        return;
      }
      setTitle("");
      setBody("");
      setFile(null);
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
          <Megaphone size={15} className="text-zinc-400" />
          New announcement
        </div>
        <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write an update for the class..."
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600"><FileUp size={14} className="text-[#6b1029]" /><span className="truncate">{file?.name ?? "Attach PDF (optional, max 20 MB)"}</span><input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={submitting} size="sm">
          {submitting ? "Posting..." : "Post to class stream"}
        </Button>
      </form>
    </Card>
  );
}
