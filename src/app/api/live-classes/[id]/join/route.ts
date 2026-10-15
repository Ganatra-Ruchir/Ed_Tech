import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { createAccessToken, isLiveKitConfigured, liveKitConfig, recordingConfigured, startRecording } from "@/lib/live/livekit";
import { loadAccessibleClass, notifyRefresh, roomSettingsFor, syncRoomSettings } from "@/lib/live/classes";
import { breakoutRoomName } from "@/lib/live/protocol";

/**
 * Returns a LiveKit token for the caller, or tells them why they can't join yet
 * (waiting room, locked, not started, ended, removed). Hosts joining a scheduled
 * class start it. Body: `{ breakout?: number }` lets hosts visit a breakout room;
 * students are always sent to the room they're assigned to.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  if (!isLiveKitConfigured()) {
    return NextResponse.json({ status: "unconfigured", error: "Live video is not set up on this server yet." }, { status: 503 });
  }
  const { id } = await params;
  const { liveClass: found, isHost } = await loadAccessibleClass(session, id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let liveClass = found;
  const body = (await request.json().catch(() => ({}))) as { breakout?: number };

  if (liveClass.status === "ENDED" || liveClass.status === "CANCELLED") {
    return NextResponse.json({ status: liveClass.status === "ENDED" ? "ended" : "cancelled" });
  }

  if (liveClass.status === "SCHEDULED") {
    if (!isHost) return NextResponse.json({ status: "not-started", scheduledAt: liveClass.scheduledAt });
    liveClass = await prisma.liveClass.update({
      where: { id },
      data: { status: "LIVE", startedAt: new Date() },
      include: { batch: { select: { name: true } }, host: { select: { name: true } } },
    });
    await logAudit({ actorId: session.sub, action: "LIVE_CLASS_STARTED", entityType: "LiveClass", entityId: id });
    if (liveClass.autoRecord && recordingConfigured()) {
      try {
        const info = await startRecording(liveClass.roomName, `${liveClass.id}-${Date.now()}`);
        await prisma.liveClassRecording.create({ data: { liveClassId: id, egressId: info.egressId } });
      } catch (error) {
        console.error("Auto-record failed to start", error);
      }
    }
  }

  let room = liveClass.roomName;
  if (!isHost) {
    const seat = await prisma.liveClassParticipant.findUnique({
      where: { liveClassId_userId: { liveClassId: id, userId: session.sub } },
    });
    if (seat?.status === "REMOVED") return NextResponse.json({ status: "removed" });
    if (seat?.status === "DENIED") return NextResponse.json({ status: "denied" });
    const admitted = seat?.status === "ADMITTED";
    if (!admitted && liveClass.locked) return NextResponse.json({ status: "locked" });
    if (!admitted && liveClass.waitingRoom) {
      if (!seat) {
        await prisma.liveClassParticipant.create({ data: { liveClassId: id, userId: session.sub, status: "WAITING" } });
        await notifyRefresh(liveClass, "waiting", true);
      }
      return NextResponse.json({ status: "waiting" });
    }
    if (!seat) {
      await prisma.liveClassParticipant.create({ data: { liveClassId: id, userId: session.sub, status: "ADMITTED" } });
    }
    if (liveClass.breakoutsOpen && seat?.breakoutRoom) room = breakoutRoomName(liveClass.roomName, seat.breakoutRoom);
  } else if (liveClass.breakoutsOpen && body.breakout && body.breakout >= 1 && body.breakout <= liveClass.breakoutCount) {
    room = breakoutRoomName(liveClass.roomName, body.breakout);
  }

  const token = await createAccessToken({ identity: session.sub, name: session.name, room, isHost, permissions: liveClass });
  // Freshly created rooms need the current settings in their metadata.
  void syncRoomSettings(liveClass).catch(() => undefined);

  return NextResponse.json({
    status: "ok",
    token,
    serverUrl: liveKitConfig()!.url,
    room,
    isHost,
    breakout: room === liveClass.roomName ? null : Number(room.split("__br")[1]),
    settings: await roomSettingsFor(liveClass),
    recordingAvailable: recordingConfigured(),
    liveClass: { id: liveClass.id, title: liveClass.title, batchName: liveClass.batch.name, hostName: liveClass.host.name },
  });
}
