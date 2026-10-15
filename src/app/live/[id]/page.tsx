import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loadAccessibleClass } from "@/lib/live/classes";
import { LiveClassRoom } from "@/components/live/LiveClassRoom";

export const dynamic = "force-dynamic";

export default async function LiveClassPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(session, id);
  if (!liveClass) notFound();
  const backHref = `/${session.role.toLowerCase()}/live-classes`;
  return <LiveClassRoom classId={id} userName={session.name} backHref={backHref} defaultMuted={!isHost && liveClass.muteOnEntry} />;
}
