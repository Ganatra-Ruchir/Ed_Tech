"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!batchId || !title.trim() || !body.trim()) {
      setError("Batch, title, and message are all required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, title, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post announcement");
        return;
      }
      setTitle("");
      setBody("");
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
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={submitting} size="sm">
          {submitting ? "Posting..." : "Post to class stream"}
        </Button>
      </form>
    </Card>
  );
}
