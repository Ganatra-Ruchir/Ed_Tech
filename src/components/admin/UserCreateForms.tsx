"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input, Label, Select } from "@/components/Field";

type UserCreateResponse = {
  error?: string;
  temporaryPassword?: string;
};

const BRANCH_OPTIONS = ["Computer Science", "Information Technology", "Mechanical", "Civil", "Electrical", "Electronics"];
const COLLEGE_OPTIONS = ["Silver Oak University", "Engineering College", "Science College", "Management College"];

function randomPassword() {
  return `${Math.random().toString(36).slice(2, 10)}A!`;
}

export function CreateFacultyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    branch: BRANCH_OPTIONS[0],
    college: COLLEGE_OPTIONS[0],
    facultyType: "CC",
    isCC: true,
    salary: "",
    dateOfBirth: "",
    joiningDate: "",
    profileImageUrl: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "FACULTY",
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          branch: form.branch,
          college: form.college,
          facultyType: form.facultyType,
          isCC: form.isCC,
          salary: form.salary ? Number(form.salary) : null,
          dateOfBirth: form.dateOfBirth || null,
          joiningDate: form.joiningDate || null,
          profileImageUrl: form.profileImageUrl || null,
          password: randomPassword(),
        }),
      });
      const data = (await response.json()) as UserCreateResponse;

      if (!response.ok) {
        setError(data.error ?? "Failed to create faculty.");
        return;
      }

      setSuccess(data.temporaryPassword ? `Faculty created. Temporary password: ${data.temporaryPassword}` : "Faculty created successfully.");
      setForm({
        name: "",
        email: "",
        branch: BRANCH_OPTIONS[0],
        college: COLLEGE_OPTIONS[0],
        facultyType: "CC",
        isCC: true,
        salary: "",
        dateOfBirth: "",
        joiningDate: "",
        profileImageUrl: "",
      });
      router.refresh();
    } catch {
      setError("Unable to create this faculty member right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add faculty
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Branch</Label>
          <Select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            {BRANCH_OPTIONS.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </Select>
        </div>
        <div>
          <Label>College</Label>
          <Select value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })}>
            {COLLEGE_OPTIONS.map((college) => <option key={college} value={college}>{college}</option>)}
          </Select>
        </div>
        <div>
          <Label>Role type</Label>
          <Select
            value={form.facultyType}
            onChange={(e) => {
              const nextType = e.target.value;
              setForm({ ...form, facultyType: nextType, isCC: nextType === "CC" });
            }}
          >
            <option value="CC">CC</option>
            <option value="SC">SC</option>
            <option value="Faculty">Faculty</option>
          </Select>
        </div>
        <div>
          <Label>Salary</Label>
          <Input type="number" min="0" step="1000" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="45000" />
        </div>
        <div>
          <Label>Date of birth</Label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        </div>
        <div>
          <Label>Joining date</Label>
          <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Profile image URL</Label>
          <Input value={form.profileImageUrl} onChange={(e) => setForm({ ...form, profileImageUrl: e.target.value })} placeholder="https://example.com/profile.jpg" />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Creating..." : "Create faculty"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>

        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        {success && <p className="text-sm text-emerald-600 sm:col-span-2">{success}</p>}
      </form>
    </Card>
  );
}

export function CreateStudentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    branch: BRANCH_OPTIONS[0],
    college: COLLEGE_OPTIONS[0],
    studentNumber: "",
    enrollmentNumber: "",
    ccName: "",
    scName: "",
    dateOfBirth: "",
    profileImageUrl: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "STUDENT",
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          branch: form.branch,
          college: form.college,
          studentNumber: form.studentNumber || null,
          enrollmentNumber: form.enrollmentNumber || null,
          ccName: form.ccName || null,
          scName: form.scName || null,
          dateOfBirth: form.dateOfBirth || null,
          profileImageUrl: form.profileImageUrl || null,
          password: randomPassword(),
        }),
      });
      const data = (await response.json()) as UserCreateResponse;

      if (!response.ok) {
        setError(data.error ?? "Failed to create student.");
        return;
      }

      setSuccess(data.temporaryPassword ? `Student created. Temporary password: ${data.temporaryPassword}` : "Student created successfully.");
      setForm({
        name: "",
        email: "",
        branch: BRANCH_OPTIONS[0],
        college: COLLEGE_OPTIONS[0],
        studentNumber: "",
        enrollmentNumber: "",
        ccName: "",
        scName: "",
        dateOfBirth: "",
        profileImageUrl: "",
      });
      router.refresh();
    } catch {
      setError("Unable to create this student right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add student
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Branch</Label>
          <Select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            {BRANCH_OPTIONS.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </Select>
        </div>
        <div>
          <Label>College</Label>
          <Select value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })}>
            {COLLEGE_OPTIONS.map((college) => <option key={college} value={college}>{college}</option>)}
          </Select>
        </div>
        <div>
          <Label>Student number</Label>
          <Input value={form.studentNumber} onChange={(e) => setForm({ ...form, studentNumber: e.target.value })} placeholder="STU-001" />
        </div>
        <div>
          <Label>Enrollment number</Label>
          <Input value={form.enrollmentNumber} onChange={(e) => setForm({ ...form, enrollmentNumber: e.target.value })} placeholder="ENR-2024-001" />
        </div>
        <div>
          <Label>CC name</Label>
          <Input value={form.ccName} onChange={(e) => setForm({ ...form, ccName: e.target.value })} placeholder="Course coordinator" />
        </div>
        <div>
          <Label>SC name</Label>
          <Input value={form.scName} onChange={(e) => setForm({ ...form, scName: e.target.value })} placeholder="Subject coordinator" />
        </div>
        <div className="sm:col-span-2">
          <Label>Date of birth</Label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Profile image URL</Label>
          <Input value={form.profileImageUrl} onChange={(e) => setForm({ ...form, profileImageUrl: e.target.value })} placeholder="https://example.com/profile.jpg" />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Creating..." : "Create student"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>

        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        {success && <p className="text-sm text-emerald-600 sm:col-span-2">{success}</p>}
      </form>
    </Card>
  );
}