"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, LoaderCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Label, Select, Textarea } from "@/components/Field";
import { DOCUMENT_ACCEPT, validateDocumentUpload } from "@/lib/uploads";

export function MaterialUploadForm({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) { setError("Choose a material file."); return; }
    const fileError = validateDocumentUpload({ name: file.name, size: file.size });
    if (fileError) { setError(fileError); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("batchId", batchId);
      formData.set("subject", subject);
      formData.set("title", title);
      formData.set("description", description);
      formData.set("file", file);
      const response = await fetch("/api/materials", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not upload material");
      setSubject(""); setTitle(""); setDescription(""); setFile(null); setOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload material");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Upload size={14} /> Upload material</Button>;

  return <form onSubmit={submit} className="grid w-full gap-4 rounded-md border border-[#dfe3dc] bg-white p-5 shadow-sm sm:grid-cols-2">
    <div className="flex items-center justify-between sm:col-span-2"><div><h2 className="text-sm font-semibold text-[#17212b]">New study material</h2><p className="text-xs text-[#667085]">Students in the selected batch will be able to access this file.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close upload form" className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f1f3ef]"><X size={16} /></button></div>
    <div><Label>Batch</Label><Select value={batchId} onChange={(event) => setBatchId(event.target.value)} required>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</Select></div>
    <div><Label>Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="e.g. Data Structures" required /></div>
    <div className="sm:col-span-2"><Label>Material title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="e.g. Unit 3 revision notes" required /></div>
    <div className="sm:col-span-2"><Label>Description (optional)</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="What should students focus on?" /></div>
    <div className="sm:col-span-2"><Label>File</Label><label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[#cbd1c8] bg-[#f8f9f6] px-4 py-4 text-sm text-[#667085] hover:border-[#ef5b3f]/40"><FileUp size={17} className="text-[#d9472e]" /><span className="min-w-0 flex-1 truncate">{file?.name ?? "Choose PDF, document, slides, spreadsheet, archive, media, or code file"}</span><input ref={fileRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><p className="mt-1.5 text-[10px] text-[#98a2b3]">Maximum file size: 50 MB</p></div>
    {error && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting || !batchId || !subject.trim() || !title.trim()}>{submitting ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}{submitting ? "Uploading..." : "Publish material"}</Button></div>
  </form>;
}
