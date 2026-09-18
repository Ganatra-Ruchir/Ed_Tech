import { notFound } from "next/navigation";
import { loadFacultyStudentRecord } from "@/lib/records";
import { StudentRecordView } from "@/components/records/StudentRecordView";

export default async function FacultyStudentDrilldown({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadFacultyStudentRecord(id);
  if (!data) notFound();

  return <StudentRecordView data={data} />;
}
