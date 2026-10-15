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
      <PageHeader icon={Video} eyebrow="Online learning" title="Live classes" description="Schedule and run online classes with video, screen sharing, polls, Q&A, breakout rooms and attendance." />
      <LiveClassesBoard
        classes={classes}
        batches={batches}
        canSchedule={true}
        detailBase={"/admin/live-classes"}
        configured={feature.configured}
      />
    </div>
  );
}
