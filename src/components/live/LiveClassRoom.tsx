"use client";

import "@livekit/components-styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, PreJoin, type LocalUserChoices } from "@livekit/components-react";
import { LoaderCircle, Video } from "lucide-react";
import { postJson, type JoinResponse } from "./api";
import { RoomStage } from "./RoomStage";

type Connected = Extract<JoinResponse, { status: "ok" }>;

const MESSAGES: Record<string, { title: string; body: string }> = {
  waiting: { title: "Waiting for the host to let you in", body: "Keep this page open. You'll join automatically when you're admitted." },
  "not-started": { title: "This class hasn't started yet", body: "Keep this page open. You'll join automatically when your teacher starts the class." },
  locked: { title: "This class is locked", body: "The host has stopped new people from joining. Ask your teacher to unlock it." },
  denied: { title: "The host didn't admit you", body: "Contact your teacher if you think this is a mistake." },
  removed: { title: "You were removed from this class", body: "You can't rejoin this session." },
  ended: { title: "This class has ended", body: "If it was recorded, the recording will appear on the live classes page." },
  cancelled: { title: "This class was cancelled", body: "Check the live classes page for the new schedule." },
  unconfigured: { title: "Live video isn't set up yet", body: "An administrator needs to add the LiveKit keys. See LIVE_CLASSES.md." },
};

export function LiveClassRoom({ classId, userName, backHref, defaultMuted }: { classId: string; userName: string; backHref: string; defaultMuted: boolean }) {
  const router = useRouter();
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [state, setState] = useState<JoinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const breakoutTarget = useRef<number | null>(null);
  const joined = useRef(false);
  /** Set while deliberately leaving or moving rooms, so the disconnect isn't treated as an error. */
  const expectedDisconnect = useRef(false);

  const join = useCallback(async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await postJson<JoinResponse>(`/api/live-classes/${classId}/join`, breakoutTarget.current ? { breakout: breakoutTarget.current } : {});
      setState(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  }, [classId]);

  // Poll while waiting to be admitted or for the class to start.
  useEffect(() => {
    if (!choices || !state || (state.status !== "waiting" && state.status !== "not-started")) return;
    const h = window.setTimeout(join, state.status === "waiting" ? 3000 : 8000);
    return () => window.clearTimeout(h);
  }, [choices, state, join]);

  const presence = useCallback(
    (event: "join" | "leave") => {
      const url = `/api/live-classes/${classId}/presence`;
      const body = JSON.stringify({ event });
      if (event === "leave" && navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      else void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => undefined);
    },
    [classId],
  );

  useEffect(() => {
    const onHide = () => joined.current && presence("leave");
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [presence]);

  function leave() {
    expectedDisconnect.current = true;
    if (joined.current) presence("leave");
    joined.current = false;
    router.push(backHref);
  }

  function switchRoom(room: number | null) {
    expectedDisconnect.current = true;
    breakoutTarget.current = room;
    setState(null);
    void join();
  }

  if (!choices) {
    return (
      <div className="live-room flex min-h-dvh items-center justify-center bg-[#1a1012] p-4" data-lk-theme="default">
        <div className="w-full max-w-xl">
          <h1 className="mb-1 text-center text-xl font-semibold text-white">Check your camera and microphone</h1>
          <p className="mb-5 text-center text-[13px] text-white/55">You can change these at any time during class.</p>
          <PreJoin
            defaults={{ username: userName, audioEnabled: !defaultMuted, videoEnabled: true }}
            joinLabel="Join class"
            userLabel="Your name"
            persistUserChoices
            onSubmit={(values) => {
              setChoices(values);
              void join();
            }}
          />
        </div>
      </div>
    );
  }

  if (!state || joining && state.status !== "waiting" && state.status !== "not-started") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#1a1012] text-white/70">
        {error ? (
          <div className="text-center">
            <p className="mb-3">{error}</p>
            <button type="button" className="lc-chip" onClick={join}>
              Try again
            </button>
          </div>
        ) : (
          <LoaderCircle className="animate-spin" />
        )}
      </div>
    );
  }

  if (state.status !== "ok") {
    const m = MESSAGES[state.status];
    const pending = state.status === "waiting" || state.status === "not-started";
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#1a1012] p-6 text-center text-white">
        <div className="max-w-sm">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            {pending ? <LoaderCircle className="animate-spin" /> : <Video />}
          </span>
          <h1 className="text-lg font-semibold">{m.title}</h1>
          <p className="mt-2 text-[13px] text-white/60">{m.body}</p>
          <button type="button" className="lc-chip mx-auto mt-5" onClick={() => router.push(backHref)}>
            Back to live classes
          </button>
        </div>
      </div>
    );
  }

  const s: Connected = state;
  return (
    <LiveKitRoom
      key={s.room}
      serverUrl={s.serverUrl}
      token={s.token}
      connect
      audio={choices.audioEnabled && (s.isHost || s.settings.allowStudentUnmute) ? { deviceId: choices.audioDeviceId } : false}
      video={choices.videoEnabled && (s.isHost || s.settings.allowStudentVideo) ? { deviceId: choices.videoDeviceId } : false}
      options={{ adaptiveStream: true, dynacast: true }}
      onConnected={() => {
        expectedDisconnect.current = false;
        joined.current = true;
        presence("join");
      }}
      onDisconnected={() => {
        if (expectedDisconnect.current) return;
        // Unexpected: the class ended or we were removed. Re-check to show why.
        joined.current = false;
        setState(null);
        void join();
      }}
      onError={(e) => setError(e.message)}
      style={{ height: "100dvh" }}
    >
      <RoomStage
        classId={classId}
        title={s.liveClass.title}
        isHost={s.isHost}
        initialSettings={s.settings}
        recordingAvailable={s.recordingAvailable}
        breakout={s.breakout}
        onSwitchRoom={switchRoom}
        onLeave={leave}
      />
    </LiveKitRoom>
  );
}
