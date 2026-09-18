"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus } from "lucide-react";
import { Card } from "@/components/Card";
import { Label, Input, Textarea, Select } from "@/components/Field";
import { Button } from "@/components/Button";
import { validateDocumentUpload, DOCUMENT_ACCEPT } from "@/lib/uploads";

type BatchOption = { id: string; name: string };

export function AssignmentForm({ batches, defaultBatchId }: { batches: BatchOption[]; defaultBatchId?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState(defaultBatchId ?? batches[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!batchId || !title.trim()) {
      setError("Choose a batch and enter a task title.");
      return;
    }
    if (file) {
      const err = validateDocumentUpload({ name: file.name, size: file.size });
      if (err) { setError(err); return; }
    }

    const formData = new FormData();
    formData.set("batchId", batchId);
    formData.set("title", title.trim());
    formData.set("description", description);
    if (dueAt) formData.set("dueAt", new Date(dueAt).toISOString());
    if (file) formData.set("file", file);

    setSubmitting(true);
    try {
      const response = await fetch("/api/assignments", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not create the task.");
        return;
      }
      setTitle("");
      setDescription("");
      setDueAt("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. The task was not created.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> New assignment</Button>;
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Assign to batch</Label>
          <Select value={batchId} onChange={(event) => setBatchId(event.target.value)} required>
            <option value="">Select a batch</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Task title</Label>
          <Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Submit your project proposal" />
        </div>
        <div className="sm:col-span-2">
          <Label>Instructions</Label>
          <Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what students need to submit." />
        </div>
        <div className="sm:col-span-2">
          <Label>Attachment (optional)</Label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-xs text-zinc-600 hover:border-[#6b1029]/40">
            <FileUp size={16} className="text-[#6b1029]" />
            <span className="min-w-0 flex-1 truncate">{file ? file.name : "PDF, DOC, PPT, image, zip, code… up to 25 MB"}</span>
            <input ref={fileRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <div className="flex items-center gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Creating..." : "Assign task"}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}