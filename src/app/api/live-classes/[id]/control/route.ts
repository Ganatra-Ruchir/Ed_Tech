import { NextResponse } from "next/server";
import { z } from "zod";
import { TrackSource, TrackType } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { egress, recordingConfigured, rooms, sendToRoom, startRecording, studentPublishSources } from "@/lib/live/livekit";
import {
  allRoomNames,
  closeAllAttendanceSessions,
  closeAttendanceSession,
  loadAccessibleClass,
  notifyRefresh,
  syncRoomSettings,
} from "@/lib/live/classes";
import { breakoutRoomName, TOPIC } from "@/lib/live/protocol";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("admit"), userId: z.string() }),
  z.object({ action: z.literal("deny"), userId: z.string() }),
  z.object({ action: z.literal("admit-all") }),
  z.object({ action: z.literal("remove"), userId: z.string() }),
  z.object({ action: z.literal("mute"), userId: z.string(), room: z.string() }),
  z.object({ action: z.literal("stop-video"), userId: z.string(), room: z.string() }),
  z.object({ action: z.literal("mute-all") }),
  z.object({ action: z.literal("ask-unmute"), userId: z.string(), room: z.string() }),
  z.object({ action: z.literal("spotlight"), userId: z.string().nullable() }),
  z.object({ action: z.literal("lock"), locked: z.boolean() }),
  z.object({
    action: z.literal("settings"),
    settings: z
      .object({
        allowChat: z.boolean(),
        allowStudentUnmute: z.boolean(),
        allowStudentVideo: z.boolean(),
        allowStudentScreenShare: z.boolean(),
        waitingRoom: z.boolean(),
        captionsEnabled: z.boolean(),
        muteOnEntry: z.boolean(),
      })
      .partial(),
  }),
  z.object({ action: z.literal("broadcast"), text: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("recording-start") }),
  z.object({ action: z.literal("recording-stop") }),
  z.object({
    action: z.literal("breakouts-open"),
    count: z.number().int().min(1).max(50),
    /** userId → room number (1-based). Students left out stay in the main room. */
    assignments: z.record(z.string(), z.number().int().min(1).max(50)),
  }),
  z.object({ action: z.literal("breakouts-close") }),
  z.object({ action: z.literal("end") }),
]);

/** Host-only in-class controls. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(session, id);
  if (!liveClass || !isHost) return NextResponse.json({ error: "Only hosts can do that." }, { status: 403 });
  if (liveClass.status !== "LIVE") return NextResponse.json({ error: "The class is not live." }, { status: 400 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const cmd = parsed.data;
  const svc = rooms();

  switch (cmd.action) {
    case "admit":
    case "deny": {
      await prisma.liveClassParticipant.updateMany({
        where: { liveClassId: id, userId: cmd.userId },
        data: { status: cmd.action === "admit" ? "ADMITTED" : "DENIED" },
      });
      await notifyRefresh(liveClass, "waiting", true);
      break;
    }
    case "admit-all": {
      await prisma.liveClassParticipant.updateMany({ where: { liveClassId: id, status: "WAITING" }, data: { status: "ADMITTED" } });
      await notifyRefresh(liveClass, "waiting", true);
      break;
    }
    case "remove": {
      await prisma.liveClassParticipant.upsert({
        where: { liveClassId_userId: { liveClassId: id, userId: cmd.userId } },
        create: { liveClassId: id, userId: cmd.userId, status: "REMOVED" },
        update: { status: "REMOVED" },
      });
      await Promise.all(allRoomNames(liveClass).map((room) => svc.removeParticipant(room, cmd.userId).catch(() => undefined)));
      await closeAttendanceSession(id, cmd.userId);
      break;
    }
    case "mute":
    case "stop-video": {
      const participant = await svc.getParticipant(cmd.room, cmd.userId).catch(() => null);
      const wanted = cmd.action === "mute" ? TrackType.AUDIO : TrackType.VIDEO;
      for (const track of participant?.tracks ?? []) {
        if (track.type === wanted && !track.muted && (cmd.action === "mute" || track.source !== TrackSource.SCREEN_SHARE)) {
          await svc.mutePublishedTrack(cmd.room, cmd.userId, track.sid, true).catch(() => undefined);
        }
      }
      break;
    }
    case "mute-all": {
      for (const room of allRoomNames(liveClass)) {
        const participants = await svc.listParticipants(room).catch(() => []);
        for (const p of participants) {
          if (p.identity === session.sub || p.attributes?.role === "host") continue;
          for (const track of p.tracks) {
            if (track.type === TrackType.AUDIO && !track.muted) {
              await svc.mutePublishedTrack(room, p.identity, track.sid, true).catch(() => undefined);
            }
          }
        }
      }
      break;
    }
    case "ask-unmute": {
      await sendToRoom(cmd.room, TOPIC.askUnmute, { from: session.name }, [cmd.userId]);
      break;
    }
    case "spotlight": {
      await syncRoomSettings(liveClass, cmd.userId);
      return NextResponse.json({ ok: true });
    }
    case "lock": {
      const updated = await prisma.liveClass.update({ where: { id }, data: { locked: cmd.locked } });
      await syncRoomSettings(updated);
      break;
    }
    case "settings": {
      const updated = await prisma.liveClass.update({ where: { id }, data: cmd.settings });
      // Apply publish permissions to everyone already in the class.
      const touchesPermissions =
        "allowStudentUnmute" in cmd.settings || "allowStudentVideo" in cmd.settings || "allowStudentScreenShare" in cmd.settings;
      if (touchesPermissions) {
        const sources = studentPublishSources(updated);
        for (const room of allRoomNames(updated)) {
          const participants = await svc.listParticipants(room).catch(() => []);
          for (const p of participants) {
            if (p.attributes?.role === "host") continue;
            await svc
              .updateParticipant(room, p.identity, {
                permission: { canSubscribe: true, canPublish: true, canPublishData: true, canUpdateMetadata: true, canPublishSources: sources },
              })
              .catch(() => undefined);
          }
        }
      }
      await syncRoomSettings(updated);
      break;
    }
    case "broadcast": {
      await Promise.all(allRoomNames(liveClass).map((room) => sendToRoom(room, TOPIC.broadcast, { from: session.name, text: cmd.text })));
      break;
    }
    case "recording-start": {
      if (!recordingConfigured()) return NextResponse.json({ error: "Recording storage is not configured on this server." }, { status: 400 });
      const active = await prisma.liveClassRecording.count({ where: { liveClassId: id, status: "RECORDING" } });
      if (active === 0) {
        const info = await startRecording(liveClass.roomName, `${liveClass.id}-${Date.now()}`);
        await prisma.liveClassRecording.create({ data: { liveClassId: id, egressId: info.egressId } });
      }
      await syncRoomSettings(liveClass);
      break;
    }
    case "recording-stop": {
      const active = await prisma.liveClassRecording.findMany({ where: { liveClassId: id, status: "RECORDING" } });
      for (const rec of active) {
        await egress().stopEgress(rec.egressId).catch(() => undefined);
        await prisma.liveClassRecording.update({ where: { id: rec.id }, data: { status: "PROCESSING", endedAt: new Date() } });
      }
      await syncRoomSettings(liveClass);
      break;
    }
    case "breakouts-open": {
      await prisma.$transaction([
        prisma.liveClassParticipant.updateMany({ where: { liveClassId: id }, data: { breakoutRoom: null } }),
        ...Object.entries(cmd.assignments)
          .filter(([, room]) => room <= cmd.count)
          .map(([userId, room]) =>
            prisma.liveClassParticipant.upsert({
              where: { liveClassId_userId: { liveClassId: id, userId } },
              create: { liveClassId: id, userId, status: "ADMITTED", breakoutRoom: room },
              update: { breakoutRoom: room },
            }),
          ),
        prisma.liveClass.update({ where: { id }, data: { breakoutsOpen: true, breakoutCount: cmd.count } }),
      ]);
      const updated = await prisma.liveClass.findUniqueOrThrow({ where: { id } });
      await syncRoomSettings(updated);
      // Tell each assigned student which room to move to.
      for (const [userId, room] of Object.entries(cmd.assignments)) {
        if (room > cmd.count) continue;
        await sendToRoom(liveClass.roomName, TOPIC.breakout, { room, name: breakoutRoomName(liveClass.roomName, room) }, [userId]);
      }
      break;
    }
    case "breakouts-close": {
      const before = await prisma.liveClass.findUniqueOrThrow({ where: { id } });
      await prisma.$transaction([
        prisma.liveClassParticipant.updateMany({ where: { liveClassId: id }, data: { breakoutRoom: null } }),
        prisma.liveClass.update({ where: { id }, data: { breakoutsOpen: false } }),
      ]);
      for (let i = 1; i <= before.breakoutCount; i++) {
        await sendToRoom(breakoutRoomName(before.roomName, i), TOPIC.breakout, { room: null });
      }
      await syncRoomSettings(await prisma.liveClass.findUniqueOrThrow({ where: { id } }));
      break;
    }
    case "end": {
      const active = await prisma.liveClassRecording.findMany({ where: { liveClassId: id, status: "RECORDING" } });
      for (const rec of active) {
        await egress().stopEgress(rec.egressId).catch(() => undefined);
        await prisma.liveClassRecording.update({ where: { id: rec.id }, data: { status: "PROCESSING", endedAt: new Date() } });
      }
      await closeAllAttendanceSessions(id);
      await prisma.liveClass.update({ where: { id }, data: { status: "ENDED", endedAt: new Date(), breakoutsOpen: false } });
      await Promise.all(allRoomNames(liveClass).map((room) => svc.deleteRoom(room).catch(() => undefined)));
      await logAudit({ actorId: session.sub, action: "LIVE_CLASS_ENDED", entityType: "LiveClass", entityId: id });
      break;
    }
  }
  if (cmd.action !== "admit" && cmd.action !== "deny" && cmd.action !== "admit-all" && cmd.action !== "end") {
    await notifyRefresh(liveClass, "settings").catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
