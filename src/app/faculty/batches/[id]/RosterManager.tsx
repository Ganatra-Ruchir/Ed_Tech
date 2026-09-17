"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2, Users } from "lucide-react";
import { Card } from "@/components/Card";
import { Label, Input } from "@/components/Field";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";

type Student = { id: string; name: string; email: string };

export function RosterManager({ batchId, students }: { batchId: string; students: Student[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNewCredentials(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${batchId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add student");
        return;
      }
      if (data.temporaryPassword) {
        setNewCredentials({ email: data.student.email, password: data.temporaryPassword });
      }
      setEmail("");
      setName("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(studentId: string) {
    if (!confirm("Remove this student from the batch?")) return;
    await fetch(`/api/batches/${batchId}/students?userId=${studentId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900">Add student by email</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_auto]">
          <div>
            <Label>Email</Label>
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@sou.edu"
            />
          </div>
          <div>
            <Label>Name (if new)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        {newCredentials && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
            <KeyRound size={14} className="mt-0.5 shrink-0" />
            <p>
              New account created for <strong>{newCredentials.email}</strong>. Temporary password:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono">{newCredentials.password}</code>
              {" — "}share this with the student now; it won&apos;t be shown again.
            </p>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-400">
          If the email already belongs to a student account, they&apos;re simply added to this batch.
          Otherwise a new student account is created.
        </p>
      </Card>

      <div>
        <h2 className="mb-2 text-[13px] font-semibold text-zinc-900">Roster ({students.length})</h2>
        <Card>
          {students.length === 0 ? (
            <EmptyState icon={Users} title="No students enrolled yet" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <p className="text-[13px] font-medium text-zinc-900">{s.name}</p>
                      <p className="text-xs text-zinc-400">{s.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(s.id)}
                    aria-label={`Remove ${s.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
