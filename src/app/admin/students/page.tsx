import { PageHeader } from "@/components/PageHeader";
import { StudentsTable } from "@/components/admin/StudentsTable";
import { getAdminStudentRows } from "@/components/admin/queries";
import { CreateStudentForm } from "@/components/admin/UserCreateForms";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GraduationCap, ShieldAlert, Star, TrendingUp, Users } from "lucide-react";

export default async function AdminStudentsPage() {
  const students = await getAdminStudentRows();
  const batches = [...new Set(students.flatMap((s) => s.batches))].sort();
  const atRiskCount = students.filter((s) => s.atRisk).length;
  const averageCompletion = students.length ? Math.round(students.reduce((sum, s) => sum + s.completionRate, 0) / students.length) : 0;
  const scoredStudents = students.filter((s) => s.hasTestData);
  const averageScore = scoredStudents.length ? Math.round(scoredStudents.reduce((sum, s) => sum + s.avgScorePct, 0) / scoredStudents.length) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        icon={GraduationCap}
        description={`${students.length} student${students.length === 1 ? "" : "s"} on record · ${atRiskCount} currently flagged at-risk.`}
        actions={<CreateStudentForm />}
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStatCard label="Total students" value={String(students.length)} icon={Users} footnote="Across all batches" />
        <AdminStatCard label="On track" value={String(students.length - atRiskCount)} icon={TrendingUp} tone="emerald" footnote="Progressing well" />
        <AdminStatCard label="At risk" value={String(atRiskCount)} icon={ShieldAlert} tone="amber" footnote="Need attention" />
        <AdminStatCard label="Avg completion" value={`${averageCompletion}%`} icon={TrendingUp} tone="violet" footnote="Across all students" />
        <AdminStatCard label="Avg score" value={scoredStudents.length ? `${averageScore}%` : "—"} icon={Star} tone="sky" footnote="Students with tests" />
      </section>
      <StudentsTable students={students} batches={batches} />
    </div>
  );
}
