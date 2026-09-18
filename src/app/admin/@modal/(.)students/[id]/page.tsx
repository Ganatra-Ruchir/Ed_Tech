import { notFound } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { StudentRecordView } from "@/components/records/StudentRecordView";
import { loadStudentRecord } from "@/lib/records";

export default async function AdminStudentDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadStudentRecord(id);
  if (!data) notFound();

  return (
    <Drawer title="Student record">
      <StudentRecordView data={data} compact />
    </Drawer>
  );
}
