import { getSession } from "@/lib/auth";
import { LiveClassReport } from "@/components/live/LiveClassReport";

export default async function LiveClassReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  return <LiveClassReport session={session!} id={id} backHref="/admin/live-classes" />;
}
