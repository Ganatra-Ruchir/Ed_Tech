import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import type { LiveClass } from "@/generated/prisma/client";
import { canAccessBatch } from "@/lib/permissions";
import { breakoutRoomName, type RoomSettings } from "./protocol";
import { isLiveKitConfigured, pushRoomSettings, recordingConfigured, sendToRoom } from "./livekit";

/** Hosts: the scheduling faculty member, admins, and course coordinators. */
export function isLiveClassHost(session: SessionPayload, liveClass: Pick<LiveClass, "hostId">) {
  return session.role === "ADMIN" || liveClass.hostId === session.sub || (session.role === "FACULTY" && session.isCC);
}

/**
 * Loads a class the session may see. Faculty of the batch may join as co-hosts;
 * students must belong to the batch.
 */
export async function loadAccessibleClass(session: SessionPayload, id: string) {
  const liveClass = await prisma.liveClass.findUnique({
    where: { id },
    include: { batch: { select: { name: true } }, host: { select: { name: true } } },
  });
  if (!liveClass) return { liveClass: null, isHost: false } as const;
  const allowed = isLiveClassHost(session, liveClass) || (await canAccessBatch(session, liveClass.batchId));
  if (!allowed) return { liveClass: null, isHost: false } as const;
  const isHost = isLiveClassHost(session, liveClass) || session.role === "FACULTY";
  return { liveClass, isHost } as const;
}

export function allRoomNames(liveClass: Pick<LiveClass, "roomName" | "breakoutCount">) {
  const names = [liveClass.roomName];
  for (let i = 1; i <= liveClass.breakoutCount; i++) names.push(breakoutRoomName(liveClass.roomName, i));
  return names;
}

export async function roomSettingsFor(liveClass: LiveClass, spotlight: string | null = null): Promise<RoomSettings> {
  const activeRecording = await prisma.liveClassRecording.count({
    where: { liveClassId: liveClass.id, status: "RECORDING" },
  });
  return {
    locked: liveClass.locked,
    allowChat: liveClass.allowChat,
    allowStudentUnmute: liveClass.allowStudentUnmute,
    allowStudentVideo: liveClass.allowStudentVideo,
    allowStudentScreenShare: liveClass.allowStudentScreenShare,
    waitingRoom: liveClass.waitingRoom,
    captionsEnabled: liveClass.captionsEnabled,
    muteOnEntry: liveClass.muteOnEntry,
    recording: activeRecording > 0,
    breakoutsOpen: liveClass.breakoutsOpen,
    breakoutCount: liveClass.breakoutCount,
    spotlight,
  };
}

/** Re-sends room settings to every room of the class and tells clients to refresh. */
export async function syncRoomSettings(liveClass: LiveClass, spotlight: string | null = null) {
  if (!isLiveKitConfigured() || liveClass.status !== "LIVE") return;
  const settings = await roomSettingsFor(liveClass, spotlight);
  await pushRoomSettings(allRoomNames(liveClass), settings);
}

/** Notify every room that some shared state changed (clients refetch it). */
export async function notifyRefresh(liveClass: LiveClass, scope: string, onlyHosts = false) {
  if (!isLiveKitConfigured() || liveClass.status !== "LIVE") return;
  await Promise.all(
    allRoomNames(liveClass).map((room) => sendToRoom(room, "lc.refresh", { scope, onlyHosts })),
  );
}

// ---------------------------------------------------------------------------
// Attendance sessions. Opening/closing is idempotent, so the browser beacon and
// the LiveKit webhook can both report joins/leaves without double counting.
// ---------------------------------------------------------------------------

export async function openAttendanceSession(liveClassId: string, userId: string) {
  const now = new Date();
  const seat = await prisma.liveClassParticipant.findUnique({ where: { liveClassId_userId: { liveClassId, userId } } });
  if (!seat) {
    await prisma.liveClassParticipant.create({
      data: { liveClassId, userId, status: "ADMITTED", firstJoinedAt: now, sessionStartedAt: now, joinCount: 1 },
    });
    return;
  }
  if (seat.sessionStartedAt) return;
  await prisma.liveClassParticipant.update({
    where: { id: seat.id },
    data: { sessionStartedAt: now, firstJoinedAt: seat.firstJoinedAt ?? now, joinCount: { increment: 1 } },
  });
}

export async function closeAttendanceSession(liveClassId: string, userId: string, at = new Date()) {
  const seat = await prisma.liveClassParticipant.findUnique({ where: { liveClassId_userId: { liveClassId, userId } } });
  if (!seat?.sessionStartedAt) return;
  const seconds = Math.max(0, Math.round((at.getTime() - seat.sessionStartedAt.getTime()) / 1000));
  await prisma.liveClassParticipant.update({
    where: { id: seat.id },
    data: { sessionStartedAt: null, lastLeftAt: at, totalSeconds: { increment: seconds } },
  });
}

export async function closeAllAttendanceSessions(liveClassId: string) {
  const open = await prisma.liveClassParticipant.findMany({
    where: { liveClassId, sessionStartedAt: { not: null } },
    select: { userId: true },
  });
  const now = new Date();
  for (const seat of open) await closeAttendanceSession(liveClassId, seat.userId, now);
}

export function liveFeatureStatus() {
  return { configured: isLiveKitConfigured(), recording: recordingConfigured() };
}

/** Safe-to-serialize view of a class for list pages. */
export function toLiveClassDTO(
  c: LiveClass & { batch: { name: string }; host: { name: string }; _count?: { recordings?: number; participants?: number } },
) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    batchId: c.batchId,
    batchName: c.batch.name,
    hostId: c.hostId,
    hostName: c.host.name,
    scheduledAt: c.scheduledAt.toISOString(),
    durationMinutes: c.durationMinutes,
    status: c.status,
    waitingRoom: c.waitingRoom,
    autoRecord: c.autoRecord,
    startedAt: c.startedAt?.toISOString() ?? null,
    endedAt: c.endedAt?.toISOString() ?? null,
    recordingCount: c._count?.recordings ?? 0,
    attendeeCount: c._count?.participants ?? 0,
  };
}
export type LiveClassDTO = ReturnType<typeof toLiveClassDTO>;
