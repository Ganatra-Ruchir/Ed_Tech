"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, UploadCloud, X, FileText, Info, AlertCircle, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Label, Input, Textarea } from "@/components/Field";
import { Button, LinkButton } from "@/components/Button";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per file, per the submission guidelines

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewSubmissionPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const next = Array.from(incoming);
    const tooBig = next.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than the 50 MB per-file limit.`);
      return;
    }
    setError(null);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...next.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please give your submission a title.");
      return;
    }
    if (files.length === 0) {
      setError("Please attach at least one file.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("notes", notes);
    files.forEach((f) => formData.append("files", f));

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to submit. Please try again.");
        return;
      }
      router.push(`/student/submissions/${data.submission.id}`);
      router.refresh();
    } catch {
      setError("Network error — your submission was not sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="max-w-3xl space-y-5">
      <Link
        href="/student/submissions"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-[#6b1029]"
      >
        <ArrowLeft size={13} /> Back to submissions
      </Link>

      <PageHeader title="New Submission" description="Upload your milestone work for faculty review." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-5">
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Milestone 2 — Prototype Development"
                className="focus:!border-[#6b1029]/40 focus:!ring-[#6b1029]/10"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Anything your reviewer should know about this milestone — scope, blockers, what to look at first."
                className="focus:!border-[#6b1029]/40 focus:!ring-[#6b1029]/10"
              />
              <p className="mt-1 text-[11px] text-zinc-400">Optional, but it helps your faculty review faster.</p>
            </div>

            <div>
              <Label>Files</Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
                  dragging ? "border-[#6b1029] bg-[#6b1029]/[0.04]" : "border-zinc-200 bg-zinc-50/60"
                }`}
              >
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#6b1029]/[0.08] text-[#6b1029]">
                  <UploadCloud size={19} />
                </span>
                <p className="mt-2.5 text-[13px] font-medium text-zinc-700">
                  Drag and drop your files here
                </p>
                <p className="mt-0.5 text-[11.5px] text-zinc-400">PDF, DOCX, PPT or ZIP · up to 50 MB per file</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#6b1029] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#7c1638]"
                >
                  <Plus size={13} /> Choose files
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>

              <AnimatePresence initial={false}>
                {files.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1.5 overflow-hidden"
                  >
                    {files.map((f, i) => (
                      <motion.li
                        key={`${f.name}:${f.size}`}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="flex items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-3 py-2"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#6b1029]/[0.08] text-[#6b1029]">
                          <FileText size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-zinc-900">{f.name}</span>
                          <span className="block text-[11px] text-zinc-400">{fmtSize(f.size)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${f.name}`}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X size={13} />
                        </button>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>

              {files.length > 0 && (
                <p className="mt-2 text-[11px] text-zinc-400">
                  {files.length} file{files.length === 1 ? "" : "s"} selected · {fmtSize(totalBytes)} total
                </p>
              )}
            </div>

            {error && (
              <p className="flex items-start gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="!bg-[#6b1029] hover:!bg-[#7c1638] disabled:!bg-[#6b1029]/40"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </Button>
              <LinkButton href="/student/submissions" variant="secondary">
                Cancel
              </LinkButton>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#6b1029]/[0.08] text-[#6b1029]">
              <Info size={15} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">Submission guidelines</p>
              <ul className="mt-1.5 space-y-1 text-[12.5px] text-zinc-600">
                <li>Supported formats: PDF, DOCX, PPT, ZIP — maximum 50 MB per file.</li>
                <li>Include proper documentation and supporting evidence for the milestone.</li>
                <li>Name your files clearly so your reviewer can find what they need.</li>
                <li>Submitted work goes to your faculty for review; you will see their feedback here.</li>
              </ul>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
