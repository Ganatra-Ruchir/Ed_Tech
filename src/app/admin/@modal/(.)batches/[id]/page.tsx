import { notFound } from "next/navigation";
import { getBatchOverview } from "@/lib/dashboard";
import { Drawer } from "@/components/Drawer";
import { BatchRecordView } from "@/components/records/BatchRecordView";

export default async function AdminBatchDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const overview = await getBatchOverview(id).catch(() => null);
  if (!overview) notFound();

  return (
    <Drawer title="Batch record" widthClassName="max-w-3xl">
      <BatchRecordView overview={overview} id={id} compact />
    </Drawer>
  );
}
