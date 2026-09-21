"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Label, Select } from "@/components/Field";
import type { FacultyRow, StudentRow } from "@/components/admin/types";

const BRANCH_OPTIONS = ["Computer Science", "Information Technology", "Mechanical", "Civil", "Electrical", "Electronics"];
const COLLEGE_OPTIONS = ["Silver Oak University", "Engineering College", "Science College", "Management College"];

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function EditUserDialog({ user, role }: { user: StudentRow | FacultyRow; role: "STUDENT" | "FACULTY" }) {
  const router = useRouter();
  const faculty = role === "FACULTY" ? user as FacultyRow : null;
  const student = role === "STUDENT" ? user as StudentRow : null;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    branch: user.branch ?? "",
    college: user.college ?? "",
    profileImageUrl: user.profileImageUrl ?? "",
    dateOfBirth: dateInput(user.dateOfBirth),
    facultyType: faculty?.facultyType ?? "Faculty",
    isCC: faculty?.isCC ?? false,
    salary: faculty?.salary?.toString() ?? "",
    joiningDate: dateInput(faculty?.joiningDate ?? null),
    studentNumber: student?.studentNumber ?? "",
    enrollmentNumber: student?.enrollmentNumber ?? "",
    ccName: student?.ccName ?? "",
    scName: student?.scName ?? "",
  });

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salary: form.salary ? Number(form.salary) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update this account");
      setOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={`Edit ${user.name}`} aria-label={`Edit ${user.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-[#ef5b3f]/40 hover:bg-[#fff8f5] hover:text-[#d9472e]"><Pencil size={13} /></button>
      <AnimatePresence>
        {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button type="button" aria-label="Close editor" className="absolute inset-0 bg-zinc-950/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div role="dialog" aria-modal="true" aria-labelledby={`edit-user-${user.id}`} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border border-[#dfe3dc] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7eae4] bg-white px-5 py-4"><div><h2 id={`edit-user-${user.id}`} className="text-base font-semibold text-[#17212b]">Edit {role === "FACULTY" ? "faculty" : "student"}</h2><p className="text-xs text-[#667085]">Update account and profile information.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f1f3ef]"><X size={17} /></button></div>
            <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
              <div><Label>Name</Label><Input required value={form.name} onChange={(event) => update("name", event.target.value)} /></div>
              <div><Label>Email</Label><Input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></div>
              <div><Label>Branch</Label><Select value={form.branch} onChange={(event) => update("branch", event.target.value)}><option value="">Not specified</option>{BRANCH_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></div>
              <div><Label>College</Label><Select value={form.college} onChange={(event) => update("college", event.target.value)}><option value="">Not specified</option>{COLLEGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></div>
              <div><Label>Date of birth</Label><Input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></div>
              <div><Label>Profile image URL</Label><Input value={form.profileImageUrl} onChange={(event) => update("profileImageUrl", event.target.value)} placeholder="https://..." /></div>

              {faculty ? <>
                <div><Label>Faculty type</Label><Select value={form.facultyType} onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, facultyType: value, isCC: value === "CC" })); }}><option value="CC">CC</option><option value="SC">SC</option><option value="Faculty">Faculty</option></Select></div>
                <div><Label>Salary</Label><Input type="number" min="0" step="1000" value={form.salary} onChange={(event) => update("salary", event.target.value)} /></div>
                <div><Label>Joining date</Label><Input type="date" value={form.joiningDate} onChange={(event) => update("joiningDate", event.target.value)} /></div>
              </> : <>
                <div><Label>Student number</Label><Input value={form.studentNumber} onChange={(event) => update("studentNumber", event.target.value)} /></div>
                <div><Label>Enrollment number</Label><Input value={form.enrollmentNumber} onChange={(event) => update("enrollmentNumber", event.target.value)} /></div>
                <div><Label>CC name</Label><Input value={form.ccName} onChange={(event) => update("ccName", event.target.value)} /></div>
                <div><Label>SC name</Label><Input value={form.scName} onChange={(event) => update("scName", event.target.value)} /></div>
              </>}

              {error && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-[#eceee9] pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "Saving..." : "Save changes"}</Button></div>
            </form>
          </motion.div>
        </div>}
      </AnimatePresence>
    </>
  );
}
