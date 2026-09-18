import { PageHeader } from "@/components/PageHeader";
import { BatchesTable } from "@/components/admin/BatchesTable";
import { getAdminBatchRows } from "@/components/admin/queries";

export default async function AdminBatchesPage() {
  const batches = await getAdminBatchRows();
  const departments = [...new Set(batches.map((b) => b.department))].sort();
  const semesters = [...new Set(batches.map((b) => b.semester))].sort();
  const studentTotal = batches.reduce((a, b) => a + b.studentCount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Batches"
        description={`${batches.length} batch${batches.length === 1 ? "" : "es"} across ${departments.length} department${departments.length === 1 ? "" : "s"} · ${studentTotal} enrolled students.`}
      />
      <BatchesTable batches={batches} departments={departments} semesters={semesters} />
    </div>
  );
}
