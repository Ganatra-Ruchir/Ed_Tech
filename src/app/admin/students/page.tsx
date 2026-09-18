import { PageHeader } from "@/components/PageHeader";
import { StudentsTable } from "@/components/admin/StudentsTable";
import { getAdminStudentRows } from "@/components/admin/queries";
import { CreateStudentForm } from "@/components/admin/UserCreateForms";

export default async function AdminStudentsPage() {
  const students = await getAdminStudentRows();
  const batches = [...new Set(students.flatMap((s) => s.batches))].sort();
  const atRiskCount = students.filter((s) => s.atRisk).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length === 1 ? "" : "s"} on record · ${atRiskCount} currently flagged at-risk.`}
        actions={<CreateStudentForm />}
      />
      <StudentsTable students={students} batches={batches} />
    </div>
  );
}
