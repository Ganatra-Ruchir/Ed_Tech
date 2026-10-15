import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-guard";
import { closeAttendanceSession, loadAccessibleClass, openAttendanceSession } from "@/lib/live/classes";

/**
 * Attendance beacon from the browser (`join` after connecting, `leave` on
 * disconnect or page close). The LiveKit webhook reports the same events when
 * configured; both paths are idempotent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass } = await loadAccessibleClass(guard.session, id);
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { event?: string } | null;
  if (body?.event === "join" && liveClass.status === "LIVE") await openAttendanceSession(id, guard.session.sub);
  else if (body?.event === "leave") await closeAttendanceSession(id, guard.session.sub);
  return NextResponse.json({ ok: true });
}
