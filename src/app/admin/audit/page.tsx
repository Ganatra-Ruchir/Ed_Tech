import { PageHeader } from "@/components/PageHeader";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { getAdminAuditRows } from "@/components/admin/queries";

export default async function AdminAuditPage() {
  const logs = await getAdminAuditRows();
  const actions = [...new Set(logs.map((l) => l.action))].sort();
  const entityTypes = [...new Set(logs.map((l) => l.entityType))].sort();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Logs"
        description={`Track reviews, grading and report activity across the platform. Showing the ${logs.length} most recent entr${logs.length === 1 ? "y" : "ies"}.`}
      />
      <AuditLogTable logs={logs} actions={actions} entityTypes={entityTypes} />
    </div>
  );
}
