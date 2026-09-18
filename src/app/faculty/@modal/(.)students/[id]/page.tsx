import { notFound } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { StudentRecordView } from "@/components/records/StudentRecordView";
import { loadFacultyStudentRecord } from "@/lib/records";

export default async function FacultyStudentDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadFacultyStudentRecord(id);
  if (!data) notFound();

  return (
    <Drawer title="Student record">
      <StudentRecordView data={data} compact />
    </Drawer>
  );
}
