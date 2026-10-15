"use client";

import type { RoomSettings } from "@/lib/live/protocol";

export type JoinResponse =
  | {
      status: "ok";
      token: string;
      serverUrl: string;
      room: string;
      isHost: boolean;
      breakout: number | null;
      settings: RoomSettings;
      recordingAvailable: boolean;
      liveClass: { id: string; title: string; batchName: string; hostName: string };
    }
  | { status: "waiting" | "locked" | "denied" | "removed" | "ended" | "cancelled" | "unconfigured"; error?: string }
  | { status: "not-started"; scheduledAt: string };

export async function postJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(data && typeof data === "object" && "status" in data)) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** Host control call: POST /api/live-classes/:id/control */
export function control(classId: string, body: Record<string, unknown>) {
  return postJson(`/api/live-classes/${classId}/control`, body);
}
