import { Video } from "lucide-react";
import { getSession } from "@/lib/auth";
import { listLiveClassesFor } from "@/lib/live/queries";
import { PageHeader } from "@/components/PageHeader";
import { LiveClassesBoard } from "@/components/live/LiveClassesBoard";

export default async function LiveClassesPage() {
  const session = await getSession();
  const { classes, batches, feature } = await listLiveClassesFor(session!);
  return (
    <div className="space-y-5">
      <PageHeader icon={Video} eyebrow="Online learning" title="Live classes" description="Join your scheduled online classes and watch recordings of past ones." />
      <LiveClassesBoard
        classes={classes}
        batches={batches}
        canSchedule={false}
        detailBase={null}
        configured={feature.configured}
      />
    </div>
  );
}
