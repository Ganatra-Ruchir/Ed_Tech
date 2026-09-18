import { notFound } from "next/navigation";
import { loadStudentRecord } from "@/lib/records";
import { StudentRecordView } from "@/components/records/StudentRecordView";

export default async function AdminStudentDrilldown({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadStudentRecord(id);
  if (!data) notFound();

  return <StudentRecordView data={data} />;
}
