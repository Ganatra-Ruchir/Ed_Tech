import { PageHeader } from "@/components/PageHeader";
import { FacultyTable } from "@/components/admin/FacultyTable";
import { getAdminFacultyRows } from "@/components/admin/queries";
import { CreateFacultyForm } from "@/components/admin/UserCreateForms";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GraduationCap, Megaphone, Network, Users } from "lucide-react";

export default async function AdminFacultyPage() {
  const faculty = await getAdminFacultyRows();
  const departments = [...new Set(faculty.flatMap((f) => f.departments))].sort();
  const ccCount = faculty.filter((f) => f.isCC).length;
  const assignedBatchCount = new Set(faculty.flatMap((f) => f.batches)).size;
  const announcementCount = faculty.reduce((sum, f) => sum + f.announcements, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Faculty"
        icon={GraduationCap}
        description={`${faculty.length} faculty member${faculty.length === 1 ? "" : "s"} · ${ccCount} course coordinator${ccCount === 1 ? "" : "s"}.`}
        actions={<CreateFacultyForm />}
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStatCard label="Total faculty" value={String(faculty.length)} icon={Users} footnote="Across all departments" />
        <AdminStatCard label="Course coordinators" value={String(ccCount)} icon={Network} tone="sky" footnote="Coordinator role" />
        <AdminStatCard label="Active batches" value={String(assignedBatchCount)} icon={GraduationCap} tone="amber" footnote="With faculty assigned" />
        <AdminStatCard label="Announcements" value={String(announcementCount)} icon={Megaphone} tone="violet" footnote="Posted by faculty" />
      </section>
      <FacultyTable faculty={faculty} departments={departments} />
    </div>
  );
}
