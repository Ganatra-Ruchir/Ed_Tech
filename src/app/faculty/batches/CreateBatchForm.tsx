"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/Card";
import { Label, Input } from "@/components/Field";
import { Button } from "@/components/Button";

export function CreateBatchForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Information Technology");
  const [semester, setSemester] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, department, semester }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create batch");
        return;
      }
      setName("");
      setSemester("");
      setOpen(false);
      router.push(`/faculty/batches/${data.batch.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> New batch
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>Batch name</Label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. IT B.Tech - Batch C"
          />
        </div>
        <div>
          <Label>Department</Label>
          <Input required value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div>
          <Label>Semester</Label>
          <Input required value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="7" />
        </div>
        <div className="flex items-center gap-2 sm:col-span-3">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Creating..." : "Create batch"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-sm text-rose-600 sm:col-span-3">{error}</p>}
      </form>
    </Card>
  );
}
