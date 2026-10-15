/**
 * Shared between server and browser: data-channel topics, attribute keys and
 * the room-metadata shape for live classes. No server-only imports here.
 */

export const TOPIC = {
  reaction: "lc.reaction",
  caption: "lc.caption",
  whiteboard: "lc.wb",
  whiteboardSyncRequest: "lc.wb.sync-req",
  /** Server → clients: something changed, refetch (polls, Q&A, waiting room). */
  refresh: "lc.refresh",
  /** Server → one client: host asks you to unmute. */
  askUnmute: "lc.ask-unmute",
  /** Server → clients: move to breakout room / return to main room. */
  breakout: "lc.breakout",
  /** Server → clients: host broadcast message (shown in every room). */
  broadcast: "lc.broadcast",
  /** Host → clients: lower every raised hand. */
  lowerHands: "lc.lower-hands",
} as const;

export const ATTR = {
  role: "role",
  hand: "hand",
} as const;

export type LiveRole = "host" | "student";

export type RefreshScope = "polls" | "questions" | "waiting" | "settings" | "recording";

export type RoomSettings = {
  locked: boolean;
  allowChat: boolean;
  allowStudentUnmute: boolean;
  allowStudentVideo: boolean;
  allowStudentScreenShare: boolean;
  waitingRoom: boolean;
  captionsEnabled: boolean;
  muteOnEntry: boolean;
  recording: boolean;
  breakoutsOpen: boolean;
  breakoutCount: number;
  /** Identity everyone's view should focus on, or null. */
  spotlight: string | null;
};

export const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🎉"] as const;

export function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

export function decodeJson<T>(payload: Uint8Array): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as T;
  } catch {
    return null;
  }
}

export function breakoutRoomName(mainRoom: string, index: number) {
  return `${mainRoom}__br${index}`;
}

/** Main room name for any room (main or breakout). */
export function mainRoomOf(roomName: string) {
  return roomName.split("__br")[0];
}
