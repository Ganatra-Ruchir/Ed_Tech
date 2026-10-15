"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CarouselLayout,
  Chat,
  ConnectionStateToast,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  MediaDeviceMenu,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useRoomInfo,
  useTracks,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { RoomEvent, Track, type LocalVideoTrack } from "livekit-client";
import {
  Captions,
  CircleDot,
  Hand,
  LayoutGrid,
  Lock,
  LogOut,
  MessageSquare,
  PenLine,
  PhoneOff,
  Presentation,
  Settings2,
  SmilePlus,
  Sparkles,
  Split,
  Users,
  BarChart3,
  HelpCircle,
  X,
} from "lucide-react";
import { ATTR, decodeJson, REACTIONS, TOPIC, type RefreshScope, type RoomSettings } from "@/lib/live/protocol";
import { control } from "./api";
import { BreakoutsPanel, HostSettingsPanel, PeoplePanel, PollsPanel, QuestionsPanel } from "./panels";
import { useWhiteboardState, Whiteboard } from "./Whiteboard";
import { captionsSupported, useLiveCaptions } from "./useCaptions";

type Panel = "chat" | "people" | "polls" | "qa" | "breakouts" | "settings" | null;
type FloatingReaction = { id: number; emoji: string; name: string; left: number };

function useElapsed(since: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(h);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function RoomStage({
  classId,
  title,
  isHost,
  initialSettings,
  recordingAvailable,
  breakout,
  onSwitchRoom,
  onLeave,
}: {
  classId: string;
  title: string;
  isHost: boolean;
  initialSettings: RoomSettings;
  recordingAvailable: boolean;
  breakout: number | null;
  onSwitchRoom: (room: number | null) => void;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const { metadata } = useRoomInfo();
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const settings: RoomSettings = useMemo(() => {
    try {
      return metadata ? { ...initialSettings, ...(JSON.parse(metadata) as RoomSettings) } : initialSettings;
    } catch {
      return initialSettings;
    }
  }, [metadata, initialSettings]);

  const [panel, setPanel] = useState<Panel>(null);
  const [layout, setLayout] = useState<"speaker" | "gallery">("speaker");
  const [pinned, setPinned] = useState<TrackReferenceOrPlaceholder | null>(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [blur, setBlur] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [banner, setBanner] = useState<{ text: string; tone: "info" | "ask" } | null>(null);
  const [refresh, setRefresh] = useState<Record<RefreshScope, number>>({ polls: 0, questions: 0, waiting: 0, settings: 0, recording: 0 });
  const [unread, setUnread] = useState<{ polls: boolean; qa: boolean; waiting: boolean }>({ polls: false, qa: false, waiting: false });
  const [startedAt] = useState(() => Date.now());
  const elapsed = useElapsed(startedAt);
  const whiteboard = useWhiteboardState(isHost);
  const captions = useLiveCaptions(settings.captionsEnabled);
  const handRaised = localParticipant.attributes?.[ATTR.hand] === "1";
  const raisedHands = participants.filter((p) => p.attributes?.[ATTR.hand] === "1").length;

  // --- Data channel messages ------------------------------------------------
  const reactionCounter = useRef(0);
  const showReaction = useCallback((emoji: string, name: string) => {
    const id = ++reactionCounter.current;
    setFloating((list) => [...list.slice(-20), { id, emoji, name, left: 8 + Math.random() * 20 }]);
    window.setTimeout(() => setFloating((list) => list.filter((r) => r.id !== id)), 4000);
  }, []);
  const { send: sendReaction } = useDataChannel(TOPIC.reaction, (msg) => {
    const data = decodeJson<{ emoji: string }>(msg.payload);
    if (data) showReaction(data.emoji, msg.from?.name ?? "");
  });
  useDataChannel(TOPIC.refresh, (msg) => {
    const data = decodeJson<{ scope: RefreshScope; onlyHosts?: boolean }>(msg.payload);
    if (!data || (data.onlyHosts && !isHost)) return;
    setRefresh((r) => ({ ...r, [data.scope]: r[data.scope] + 1 }));
    if (data.scope === "polls" && panel !== "polls") setUnread((u) => ({ ...u, polls: true }));
    if (data.scope === "questions" && panel !== "qa") setUnread((u) => ({ ...u, qa: true }));
    if (data.scope === "waiting" && isHost && panel !== "people") setUnread((u) => ({ ...u, waiting: true }));
  });
  useDataChannel(TOPIC.askUnmute, (msg) => {
    const data = decodeJson<{ from: string }>(msg.payload);
    setBanner({ text: `${data?.from ?? "The host"} is asking you to unmute.`, tone: "ask" });
  });
  useDataChannel(TOPIC.broadcast, (msg) => {
    const data = decodeJson<{ from: string; text: string }>(msg.payload);
    if (data) setBanner({ text: `${data.from}: ${data.text}`, tone: "info" });
  });
  useDataChannel(TOPIC.breakout, (msg) => {
    const data = decodeJson<{ room: number | null }>(msg.payload);
    if (!data) return;
    if (isHost && data.room === null) return; // hosts choose where to go
    setBanner({ text: data.room ? `Moving you to breakout room ${data.room}…` : "Breakout rooms closed. Returning to the main room…", tone: "info" });
    window.setTimeout(() => onSwitchRoom(data.room), 1500);
  });
  useDataChannel(TOPIC.lowerHands, () => {
    void localParticipant.setAttributes({ [ATTR.hand]: "" }).catch(() => undefined);
  });

  // Host gets a nudge when someone raises a hand.
  useEffect(() => {
    if (!isHost) return;
    const onAttrs = (changed: Record<string, string>, participant: { name?: string; isLocal?: boolean }) => {
      if (changed[ATTR.hand] === "1" && !participant.isLocal) setBanner({ text: `${participant.name} raised their hand`, tone: "info" });
    };
    room.on(RoomEvent.ParticipantAttributesChanged, onAttrs);
    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, onAttrs);
    };
  }, [room, isHost]);

  useEffect(() => {
    if (!banner) return;
    const h = window.setTimeout(() => setBanner(null), banner.tone === "ask" ? 10000 : 6000);
    return () => window.clearTimeout(h);
  }, [banner]);

  // Students lose the chat panel as soon as the host disables chat.
  const openPanel: Panel = !isHost && !settings.allowChat && panel === "chat" ? null : panel;

  // --- Background blur ---------------------------------------------------------
  useEffect(() => {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
    if (!track) return;
    let cancelled = false;
    (async () => {
      if (blur) {
        const { BackgroundBlur } = await import("@livekit/track-processors");
        if (!cancelled) await track.setProcessor(BackgroundBlur(12)).catch(() => setBlur(false));
      } else if (track.getProcessor()) {
        await track.stopProcessor().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blur, localParticipant]);

  // --- Video layout ------------------------------------------------------------
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );
  const screenShare = tracks.find((t) => isTrackReference(t) && t.publication.source === Track.Source.ScreenShare);
  const spotlightTrack = settings.spotlight
    ? tracks.find((t) => t.participant.identity === settings.spotlight && t.source === Track.Source.Camera)
    : undefined;
  const activeSpeaker = tracks.find((t) => t.source === Track.Source.Camera && t.participant.isSpeaking && !t.participant.isLocal);
  const pinnedStill = pinned && tracks.find((t) => t.participant.identity === pinned.participant.identity && t.source === pinned.source);
  const focus =
    pinnedStill ?? screenShare ?? spotlightTrack ?? (layout === "speaker" && tracks.length > 1 ? activeSpeaker ?? tracks.find((t) => !t.participant.isLocal) : undefined);
  const others = focus ? tracks.filter((t) => t !== focus) : tracks;

  function togglePanel(p: Panel) {
    setPanel((cur) => (cur === p ? null : p));
    if (p === "polls") setUnread((u) => ({ ...u, polls: false }));
    if (p === "qa") setUnread((u) => ({ ...u, qa: false }));
    if (p === "people") setUnread((u) => ({ ...u, waiting: false }));
  }

  const canUnmute = isHost || settings.allowStudentUnmute;
  const canVideo = isHost || settings.allowStudentVideo;
  const canShare = isHost || settings.allowStudentScreenShare;

  return (
    <div className="live-room flex h-dvh flex-col bg-[#1a1012] text-white" data-lk-theme="default">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{title}</p>
          <p className="text-[11px] text-white/50">
            {breakout ? `Breakout room ${breakout}` : "Main room"} · {participants.length} in room · {elapsed}
          </p>
        </div>
        {settings.recording && (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
            <CircleDot size={12} className="animate-pulse" /> Recording
          </span>
        )}
        {settings.locked && (
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/70">
            <Lock size={11} /> Locked
          </span>
        )}
        <button type="button" className="lc-icon-btn" onClick={() => setLayout(layout === "speaker" ? "gallery" : "speaker")} aria-label="Switch layout" title={layout === "speaker" ? "Gallery view" : "Speaker view"}>
          {layout === "speaker" ? <LayoutGrid size={17} /> : <Presentation size={17} />}
        </button>
      </header>

      {banner && (
        <div className={`flex items-center gap-3 px-4 py-2 text-[13px] ${banner.tone === "ask" ? "bg-amber-400/15 text-amber-100" : "bg-white/10 text-white"}`}>
          <span className="flex-1">{banner.text}</span>
          {banner.tone === "ask" && (
            <button
              type="button"
              className="lc-chip"
              onClick={() => {
                void localParticipant.setMicrophoneEnabled(true);
                setBanner(null);
              }}
            >
              Unmute
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Stage */}
        <main className="relative min-w-0 flex-1 p-2">
          {whiteboardOpen ? (
            <Whiteboard
              strokes={whiteboard.strokes}
              onStroke={whiteboard.addStroke}
              onClear={whiteboard.clear}
              onClose={() => setWhiteboardOpen(false)}
              canClear={isHost}
            />
          ) : focus ? (
            <FocusLayoutContainer className="h-full">
              <CarouselLayout tracks={others}>
                <ParticipantTile onParticipantClick={(e) => setPinned(e.track ? tracks.find((t) => t.participant === e.participant && t.source === e.track?.source) ?? null : null)} />
              </CarouselLayout>
              <FocusLayout trackRef={focus} onParticipantClick={() => setPinned(null)} />
            </FocusLayoutContainer>
          ) : (
            <GridLayout tracks={tracks} className="h-full">
              <ParticipantTile />
            </GridLayout>
          )}

          {/* Floating reactions */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {floating.map((r) => (
              <div key={r.id} className="lc-float" style={{ left: `${r.left}%` }}>
                <span className="text-4xl">{r.emoji}</span>
                <span className="mt-0.5 rounded bg-black/50 px-1.5 text-[10px]">{r.name}</span>
              </div>
            ))}
          </div>

          {/* Captions */}
          {showCaptions && captions.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 px-4">
              {captions.map((c) => (
                <p key={c.identity} className="max-w-3xl rounded-md bg-black/70 px-3 py-1.5 text-center text-[15px] leading-snug">
                  <span className="font-semibold text-[#f3b2b4]">{c.name}: </span>
                  {c.text}
                </p>
              ))}
            </div>
          )}
        </main>

        {/* Side panel */}
        {openPanel && (
          <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-l border-white/10 bg-[#211417] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-[14px] font-semibold">
                {{ chat: "Chat", people: `People (${participants.length})`, polls: "Polls", qa: "Q&A", breakouts: "Breakout rooms", settings: "Host settings" }[openPanel]}
              </p>
              <button type="button" className="lc-icon-btn" aria-label="Close panel" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>
            <div className={`min-h-0 flex-1 ${openPanel === "chat" ? "" : "overflow-y-auto p-4"}`}>
              {openPanel === "chat" && <Chat className="lc-chat h-full" />}
              {openPanel === "people" && <PeoplePanel classId={classId} isHost={isHost} waitingRefresh={refresh.waiting} settings={settings} />}
              {openPanel === "polls" && <PollsPanel classId={classId} isHost={isHost} refreshKey={refresh.polls} />}
              {openPanel === "qa" && <QuestionsPanel classId={classId} isHost={isHost} refreshKey={refresh.questions} />}
              {openPanel === "breakouts" && isHost && <BreakoutsPanel classId={classId} settings={settings} currentBreakout={breakout} onVisit={onSwitchRoom} />}
              {openPanel === "settings" && isHost && <HostSettingsPanel classId={classId} settings={settings} recordingAvailable={recordingAvailable} />}
            </div>
          </aside>
        )}
      </div>

      {/* Toolbar */}
      <footer className="relative flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 px-3 py-2.5">
        <div className="lc-group">
          <TrackToggle source={Track.Source.Microphone} disabled={!canUnmute} className="lc-tool" showIcon>
            <span className="lc-tool-label">Mic</span>
          </TrackToggle>
          <MediaDeviceMenu kind="audioinput" className="lc-tool lc-tool-caret" />
        </div>
        <div className="lc-group">
          <TrackToggle source={Track.Source.Camera} disabled={!canVideo} className="lc-tool" showIcon>
            <span className="lc-tool-label">Video</span>
          </TrackToggle>
          <MediaDeviceMenu kind="videoinput" className="lc-tool lc-tool-caret" />
        </div>
        {canShare && (
          <TrackToggle source={Track.Source.ScreenShare} className={`lc-tool ${isScreenShareEnabled ? "is-on" : ""}`} showIcon captureOptions={{ audio: true, selfBrowserSurface: "include" }}>
            <span className="lc-tool-label">{isScreenShareEnabled ? "Stop share" : "Share"}</span>
          </TrackToggle>
        )}
        <button type="button" className={`lc-tool ${blur ? "is-on" : ""}`} onClick={() => setBlur(!blur)} title="Blur my background">
          <Sparkles size={18} />
          <span className="lc-tool-label">Blur</span>
        </button>
        <button
          type="button"
          className={`lc-tool ${handRaised ? "is-on" : ""}`}
          onClick={() => localParticipant.setAttributes({ [ATTR.hand]: handRaised ? "" : "1" })}
        >
          <Hand size={18} />
          <span className="lc-tool-label">{handRaised ? "Lower" : "Raise"}</span>
        </button>
        <div className="relative">
          <button type="button" className="lc-tool" onClick={() => setReactionsOpen(!reactionsOpen)}>
            <SmilePlus size={18} />
            <span className="lc-tool-label">React</span>
          </button>
          {reactionsOpen && (
            <div className="animate-pop-in absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-[#2b1b1f] p-1.5 shadow-xl">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded-full px-1.5 text-2xl hover:bg-white/10"
                  onClick={() => {
                    showReaction(emoji, "You");
                    void sendReaction(new TextEncoder().encode(JSON.stringify({ emoji })), { reliable: false });
                    setReactionsOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        {settings.captionsEnabled && captionsSupported() && (
          <button type="button" className={`lc-tool ${showCaptions ? "is-on" : ""}`} onClick={() => setShowCaptions(!showCaptions)}>
            <Captions size={18} />
            <span className="lc-tool-label">Captions</span>
          </button>
        )}
        <button type="button" className={`lc-tool ${whiteboardOpen ? "is-on" : ""}`} onClick={() => setWhiteboardOpen(!whiteboardOpen)}>
          <PenLine size={18} />
          <span className="lc-tool-label">Board</span>
        </button>

        <span className="mx-1 hidden h-7 w-px bg-white/10 sm:block" />

        {(isHost || settings.allowChat) && (
          <button type="button" className={`lc-tool ${panel === "chat" ? "is-on" : ""}`} onClick={() => togglePanel("chat")}>
            <MessageSquare size={18} />
            <span className="lc-tool-label">Chat</span>
          </button>
        )}
        <button type="button" className={`lc-tool ${panel === "people" ? "is-on" : ""}`} onClick={() => togglePanel("people")}>
          <Users size={18} />
          {(raisedHands > 0 || unread.waiting) && <span className="lc-dot">{raisedHands || "!"}</span>}
          <span className="lc-tool-label">People</span>
        </button>
        <button type="button" className={`lc-tool ${panel === "polls" ? "is-on" : ""}`} onClick={() => togglePanel("polls")}>
          <BarChart3 size={18} />
          {unread.polls && <span className="lc-dot" />}
          <span className="lc-tool-label">Polls</span>
        </button>
        <button type="button" className={`lc-tool ${panel === "qa" ? "is-on" : ""}`} onClick={() => togglePanel("qa")}>
          <HelpCircle size={18} />
          {unread.qa && <span className="lc-dot" />}
          <span className="lc-tool-label">Q&amp;A</span>
        </button>
        {isHost && (
          <>
            <button type="button" className={`lc-tool ${panel === "breakouts" ? "is-on" : ""}`} onClick={() => togglePanel("breakouts")}>
              <Split size={18} />
              <span className="lc-tool-label">Rooms</span>
            </button>
            <button type="button" className={`lc-tool ${panel === "settings" ? "is-on" : ""}`} onClick={() => togglePanel("settings")}>
              <Settings2 size={18} />
              <span className="lc-tool-label">Host</span>
            </button>
          </>
        )}

        <span className="mx-1 hidden h-7 w-px bg-white/10 sm:block" />

        <button type="button" className="lc-tool is-leave" onClick={onLeave}>
          <LogOut size={18} />
          <span className="lc-tool-label">Leave</span>
        </button>
        {isHost && (
          <button
            type="button"
            className="lc-tool is-end"
            onClick={async () => {
              if (!confirm("End this class for everyone? Breakout rooms and recordings stop too.")) return;
              await control(classId, { action: "end" }).catch((e: Error) => alert(e.message));
              onLeave();
            }}
          >
            <PhoneOff size={18} />
            <span className="lc-tool-label">End for all</span>
          </button>
        )}
      </footer>

      <RoomAudioRenderer />
      <StartAudio label="Click to enable class audio" className="lc-start-audio" />
      <ConnectionStateToast />
    </div>
  );
}
