import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLiveKitConfigured, recordingPublicUrl, webhookReceiver } from "@/lib/live/livekit";
import { closeAttendanceSession, openAttendanceSession } from "@/lib/live/classes";
import { mainRoomOf } from "@/lib/live/protocol";

/**
 * LiveKit webhook (set the URL to https://<your-app>/api/livekit/webhook in the
 * LiveKit dashboard). Gives authoritative join/leave times for attendance and
 * marks recordings ready. Requests are verified with the API secret.
 */
export async function POST(request: Request) {
  if (!isLiveKitConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const body = await request.text();
  let event;
  try {
    event = await webhookReceiver().receive(body, request.headers.get("authorization") ?? undefined);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const roomName = event.room?.name ?? event.egressInfo?.roomName;
  if (!roomName) return NextResponse.json({ ok: true });
  const liveClass = await prisma.liveClass.findUnique({ where: { roomName: mainRoomOf(roomName) } });
  if (!liveClass) return NextResponse.json({ ok: true });

  const identity = event.participant?.identity;
  if (event.event === "participant_joined" && identity && liveClass.status === "LIVE") {
    const user = await prisma.user.findUnique({ where: { id: identity }, select: { id: true } });
    if (user) await openAttendanceSession(liveClass.id, identity);
  } else if (event.event === "participant_left" && identity) {
    await closeAttendanceSession(liveClass.id, identity);
  } else if (event.event === "egress_ended" && event.egressInfo) {
    const info = event.egressInfo;
    const file = info.fileResults?.[0];
    const started = Number(info.startedAt ?? 0) / 1e6;
    const ended = Number(info.endedAt ?? 0) / 1e6;
    await prisma.liveClassRecording.updateMany({
      where: { egressId: info.egressId },
      data: {
        status: file ? "READY" : "FAILED",
        fileUrl: recordingPublicUrl(file?.location || file?.filename),
        endedAt: ended ? new Date(ended) : new Date(),
        durationSeconds: started && ended ? Math.round((ended - started) / 1000) : null,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
