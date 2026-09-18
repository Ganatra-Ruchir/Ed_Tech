import { PageHeader } from "@/components/PageHeader";
import { FacultyTable } from "@/components/admin/FacultyTable";
import { getAdminFacultyRows } from "@/components/admin/queries";
import { CreateFacultyForm } from "@/components/admin/UserCreateForms";

export default async function AdminFacultyPage() {
  const faculty = await getAdminFacultyRows();
  const departments = [...new Set(faculty.flatMap((f) => f.departments))].sort();
  const ccCount = faculty.filter((f) => f.isCC).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Faculty"
        description={`${faculty.length} faculty member${faculty.length === 1 ? "" : "s"} · ${ccCount} course coordinator${ccCount === 1 ? "" : "s"}.`}
        actions={<CreateFacultyForm />}
      />
      <FacultyTable faculty={faculty} departments={departments} />
    </div>
  );
}
