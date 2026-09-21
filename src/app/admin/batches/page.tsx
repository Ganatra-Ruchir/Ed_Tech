import { PageHeader } from "@/components/PageHeader";
import { BatchesTable } from "@/components/admin/BatchesTable";
import { getAdminBatchRows } from "@/components/admin/queries";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { BarChart3, GraduationCap, Layers3, Users } from "lucide-react";

export default async function AdminBatchesPage() {
  const batches = await getAdminBatchRows();
  const departments = [...new Set(batches.map((b) => b.department))].sort();
  const semesters = [...new Set(batches.map((b) => b.semester))].sort();
  const studentTotal = batches.reduce((a, b) => a + b.studentCount, 0);
  const activeFaculty = batches.reduce((a, b) => a + b.facultyCount, 0);
  const averageCompletion = batches.length ? Math.round(batches.reduce((a, b) => a + b.completionRate, 0) / batches.length) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Batches"
        icon={Users}
        description={`${batches.length} batch${batches.length === 1 ? "" : "es"} across ${departments.length} department${departments.length === 1 ? "" : "s"} · ${studentTotal} enrolled students.`}
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStatCard label="Total batches" value={String(batches.length)} icon={Layers3} footnote={`Across ${departments.length} department${departments.length === 1 ? "" : "s"}`} />
        <AdminStatCard label="Enrolled students" value={String(studentTotal)} icon={GraduationCap} tone="emerald" footnote="Across all batches" />
        <AdminStatCard label="Active faculty" value={String(activeFaculty)} icon={Users} tone="sky" footnote="Assigned to batches" />
        <AdminStatCard label="Avg completion" value={`${averageCompletion}%`} icon={BarChart3} tone="violet" footnote="Across all batches" />
      </section>
      <BatchesTable batches={batches} departments={departments} semesters={semesters} />
    </div>
  );
}
