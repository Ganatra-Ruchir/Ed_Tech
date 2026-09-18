import { notFound } from "next/navigation";
import { getBatchOverview } from "@/lib/dashboard";
import { BatchRecordView } from "@/components/records/BatchRecordView";

export default async function AdminBatchDrilldown({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const overview = await getBatchOverview(id).catch(() => null);
  if (!overview) notFound();

  return <BatchRecordView overview={overview} id={id} />;
}
