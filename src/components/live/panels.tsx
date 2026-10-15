"use client";

import { useCallback, useEffect, useState } from "react";
import { useParticipants, useRoomContext } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { Check, Hand, Mic, MicOff, MoreVertical, ThumbsUp, Trash2, UserMinus, Video, VideoOff, X, Star, Shuffle } from "lucide-react";
import { ATTR, type RoomSettings } from "@/lib/live/protocol";
import { control, getJson, postJson } from "./api";

function useRefetch<T>(url: string, refreshKey: number) {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(() => {
    getJson<T>(url).then(setData).catch(() => undefined);
  }, [url]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  return { data, reload: load };
}

function hasHand(p: Participant) {
  return p.attributes?.[ATTR.hand] === "1";
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export function PeoplePanel({
  classId,
  isHost,
  waitingRefresh,
  settings,
}: {
  classId: string;
  isHost: boolean;
  waitingRefresh: number;
  settings: RoomSettings;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const [menu, setMenu] = useState<string | null>(null);
  const { data: seats, reload } = useRefetch<{ waiting: { userId: string; name: string }[] }>(
    `/api/live-classes/${classId}/participants`,
    isHost ? waitingRefresh : -1,
  );
  const waiting = isHost ? seats?.waiting ?? [] : [];

  const sorted = [...participants].sort(
    (a, b) => Number(hasHand(b)) - Number(hasHand(a)) || (a.name ?? "").localeCompare(b.name ?? ""),
  );

  async function act(body: Record<string, unknown>) {
    setMenu(null);
    await control(classId, body).catch((e: Error) => alert(e.message));
    reload();
  }

  return (
    <div className="space-y-4">
      {isHost && waiting.length > 0 && (
        <section className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-amber-200">Waiting room ({waiting.length})</p>
            <button type="button" className="lc-chip" onClick={() => act({ action: "admit-all" })}>
              Admit all
            </button>
          </div>
          <ul className="space-y-1.5">
            {waiting.map((w) => (
              <li key={w.userId} className="flex items-center gap-2 text-[13px] text-white">
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <button type="button" className="lc-chip" onClick={() => act({ action: "admit", userId: w.userId })}>
                  Admit
                </button>
                <button type="button" className="lc-chip is-quiet" onClick={() => act({ action: "deny", userId: w.userId })}>
                  Deny
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isHost && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="lc-chip" onClick={() => act({ action: "mute-all" })}>
            Mute everyone
          </button>
          <button
            type="button"
            className="lc-chip"
            onClick={() => {
              void room.localParticipant.publishData(new TextEncoder().encode("{}"), { reliable: true, topic: "lc.lower-hands" });
              void room.localParticipant.setAttributes({ [ATTR.hand]: "" });
            }}
          >
            Lower all hands
          </button>
          {settings.spotlight && (
            <button type="button" className="lc-chip" onClick={() => act({ action: "spotlight", userId: null })}>
              Remove spotlight
            </button>
          )}
        </div>
      )}

      <ul className="space-y-1">
        {sorted.map((p) => {
          const mic = p.getTrackPublication(Track.Source.Microphone);
          const cam = p.getTrackPublication(Track.Source.Camera);
          const micOn = Boolean(mic && !mic.isMuted);
          const camOn = Boolean(cam && !cam.isMuted);
          const isPHost = p.attributes?.[ATTR.role] === "host";
          return (
            <li key={p.identity} className="relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
                {(p.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-white">
                {p.name || p.identity}
                {p.isLocal && <span className="text-white/45"> (you)</span>}
                {isPHost && <span className="ml-1 rounded bg-white/10 px-1 text-[10px] text-white/70">Host</span>}
              </span>
              {hasHand(p) && <Hand size={15} className="text-amber-300" aria-label="Hand raised" />}
              {micOn ? <Mic size={15} className="text-white/70" /> : <MicOff size={15} className="text-rose-300" />}
              {camOn ? <Video size={15} className="text-white/70" /> : <VideoOff size={15} className="text-white/40" />}
              {isHost && !p.isLocal && (
                <button type="button" aria-label="Participant actions" className="lc-icon-btn" onClick={() => setMenu(menu === p.identity ? null : p.identity)}>
                  <MoreVertical size={15} />
                </button>
              )}
              {menu === p.identity && (
                <div className="absolute right-2 top-9 z-20 w-48 overflow-hidden rounded-md border border-white/10 bg-[#2b1b1f] py-1 shadow-xl">
                  {micOn ? (
                    <button type="button" className="lc-menu-item" onClick={() => act({ action: "mute", userId: p.identity, room: room.name })}>
                      <MicOff size={14} /> Mute
                    </button>
                  ) : (
                    <button type="button" className="lc-menu-item" onClick={() => act({ action: "ask-unmute", userId: p.identity, room: room.name })}>
                      <Mic size={14} /> Ask to unmute
                    </button>
                  )}
                  {camOn && (
                    <button type="button" className="lc-menu-item" onClick={() => act({ action: "stop-video", userId: p.identity, room: room.name })}>
                      <VideoOff size={14} /> Stop video
                    </button>
                  )}
                  <button type="button" className="lc-menu-item" onClick={() => act({ action: "spotlight", userId: p.identity })}>
                    <Star size={14} /> Spotlight for everyone
                  </button>
                  <button
                    type="button"
                    className="lc-menu-item text-rose-300"
                    onClick={() => confirm(`Remove ${p.name} from this class? They won't be able to rejoin.`) && act({ action: "remove", userId: p.identity })}
                  >
                    <UserMinus size={14} /> Remove from class
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

type PollView = {
  id: string;
  question: string;
  options: string[];
  anonymous: boolean;
  isOpen: boolean;
  totalVotes: number;
  counts: number[] | null;
  myVote: number | null;
  voters: { name: string; optionIndex: number }[];
};

export function PollsPanel({ classId, isHost, refreshKey }: { classId: string; isHost: boolean; refreshKey: number }) {
  const { data, reload } = useRefetch<{ polls: PollView[] }>(`/api/live-classes/${classId}/polls`, refreshKey);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    try {
      await postJson(`/api/live-classes/${classId}/polls`, { question, options: options.filter((o) => o.trim()), anonymous });
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {isHost &&
        (creating ? (
          <div className="space-y-2 rounded-lg border border-white/10 p-3">
            <input className="lc-input" placeholder="Ask a question" value={question} onChange={(e) => setQuestion(e.target.value)} />
            {options.map((o, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className="lc-input"
                  placeholder={`Option ${i + 1}`}
                  value={o}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {options.length > 2 && (
                  <button type="button" className="lc-icon-btn" aria-label="Remove option" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <button type="button" className="lc-chip is-quiet" onClick={() => setOptions([...options, ""])}>
                Add option
              </button>
            )}
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Anonymous responses
            </label>
            {error && <p className="text-[12px] text-rose-300">{error}</p>}
            <div className="flex gap-2">
              <button type="button" className="lc-chip" onClick={create}>
                Launch poll
              </button>
              <button type="button" className="lc-chip is-quiet" onClick={() => setCreating(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="lc-chip" onClick={() => setCreating(true)}>
            New poll
          </button>
        ))}

      {data?.polls.length === 0 && <p className="text-[13px] text-white/50">{isHost ? "Polls you launch appear here." : "No polls yet."}</p>}

      {data?.polls.map((p) => (
        <article key={p.id} className="rounded-lg border border-white/10 p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-white">{p.question}</p>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${p.isOpen ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/60"}`}>
              {p.isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <ul className="space-y-1.5">
            {p.options.map((o, i) => {
              const count = p.counts?.[i] ?? 0;
              const pct = p.counts && p.totalVotes ? Math.round((count / p.totalVotes) * 100) : 0;
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={!p.isOpen || isHost}
                    onClick={() => postJson(`/api/live-classes/${classId}/polls/${p.id}`, { action: "vote", optionIndex: i }).then(reload)}
                    className={`relative w-full overflow-hidden rounded-md border px-2.5 py-1.5 text-left text-[13px] text-white ${p.myVote === i ? "border-[#e8a0a2]" : "border-white/10"} disabled:cursor-default`}
                  >
                    {p.counts && <span className="absolute inset-y-0 left-0 bg-white/10" style={{ width: `${pct}%` }} />}
                    <span className="relative flex justify-between gap-2">
                      <span>
                        {p.myVote === i && <Check size={12} className="mr-1 inline" />}
                        {o}
                      </span>
                      {p.counts && <span className="text-white/60">{pct}%</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
            <span>
              {p.totalVotes} {p.totalVotes === 1 ? "vote" : "votes"}
              {p.anonymous ? ", anonymous" : ""}
            </span>
            {isHost && (
              <button
                type="button"
                className="underline"
                onClick={() => postJson(`/api/live-classes/${classId}/polls/${p.id}`, { action: p.isOpen ? "close" : "reopen" }).then(reload)}
              >
                {p.isOpen ? "Close poll" : "Reopen"}
              </button>
            )}
          </div>
          {isHost && p.voters.length > 0 && (
            <details className="mt-1 text-[11px] text-white/60">
              <summary className="cursor-pointer">Who voted</summary>
              <ul className="mt-1 space-y-0.5">
                {p.voters.map((v, i) => (
                  <li key={i}>
                    {v.name}: {p.options[v.optionIndex]}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Q&A
// ---------------------------------------------------------------------------

type QuestionView = { id: string; text: string; answered: boolean; author: string; mine: boolean; upvotes: number; upvotedByMe: boolean };

export function QuestionsPanel({ classId, isHost, refreshKey }: { classId: string; isHost: boolean; refreshKey: number }) {
  const { data, reload } = useRefetch<{ questions: QuestionView[] }>(`/api/live-classes/${classId}/questions`, refreshKey);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const act = (id: string, action: string) => postJson(`/api/live-classes/${classId}/questions/${id}`, { action }).then(reload);

  return (
    <div className="space-y-3">
      {!isHost && (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            await postJson(`/api/live-classes/${classId}/questions`, { text, anonymous });
            setText("");
            reload();
          }}
        >
          <textarea className="lc-input min-h-16" placeholder="Ask the teacher a question" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Ask anonymously
            </label>
            <button type="submit" className="lc-chip">
              Ask
            </button>
          </div>
        </form>
      )}
      {data?.questions.length === 0 && <p className="text-[13px] text-white/50">No questions yet.</p>}
      <ul className="space-y-2">
        {data?.questions.map((q) => (
          <li key={q.id} className={`rounded-lg border border-white/10 p-2.5 ${q.answered ? "opacity-60" : ""}`}>
            <p className="text-[13px] text-white">{q.text}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
              <span className="min-w-0 flex-1 truncate">{q.author}</span>
              <button type="button" onClick={() => act(q.id, "upvote")} className={`flex items-center gap-1 ${q.upvotedByMe ? "text-[#f3b2b4]" : ""}`}>
                <ThumbsUp size={12} /> {q.upvotes}
              </button>
              {isHost && (
                <button type="button" onClick={() => act(q.id, q.answered ? "unanswered" : "answered")} className="underline">
                  {q.answered ? "Reopen" : "Mark answered"}
                </button>
              )}
              {(isHost || q.mine) && (
                <button type="button" onClick={() => act(q.id, "delete")} aria-label="Delete question">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakout rooms (host)
// ---------------------------------------------------------------------------

export function BreakoutsPanel({
  classId,
  settings,
  currentBreakout,
  onVisit,
}: {
  classId: string;
  settings: RoomSettings;
  currentBreakout: number | null;
  onVisit: (room: number | null) => void;
}) {
  const participants = useParticipants();
  const students = participants.filter((p) => p.attributes?.[ATTR.role] !== "host");
  const [count, setCount] = useState(Math.max(2, settings.breakoutCount || 2));
  const [assign, setAssign] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  function shuffle() {
    const ids = students.map((s) => s.identity).sort(() => Math.random() - 0.5);
    setAssign(Object.fromEntries(ids.map((id, i) => [id, (i % count) + 1])));
  }

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    await control(classId, body).catch((e: Error) => alert(e.message));
    setBusy(false);
  }

  if (settings.breakoutsOpen) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-white/80">{settings.breakoutCount} breakout rooms are open. Students have been moved to their rooms.</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`lc-chip ${currentBreakout === null ? "is-quiet" : ""}`} onClick={() => onVisit(null)}>
            Main room
          </button>
          {Array.from({ length: settings.breakoutCount }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className={`lc-chip ${currentBreakout === n ? "is-quiet" : ""}`} onClick={() => onVisit(n)}>
              Join room {n}
            </button>
          ))}
        </div>
        <button type="button" disabled={busy} className="lc-chip is-danger w-full" onClick={() => run({ action: "breakouts-close" })}>
          Close all rooms
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-2 text-[13px] text-white/80">
        Number of rooms
        <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="lc-input w-20" />
      </label>
      <button type="button" className="lc-chip w-full" onClick={shuffle}>
        <Shuffle size={13} /> Assign automatically
      </button>
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {students.map((s) => (
          <li key={s.identity} className="flex items-center gap-2 text-[13px] text-white">
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <select
              className="lc-input w-28"
              value={assign[s.identity] ?? 0}
              onChange={(e) => setAssign({ ...assign, [s.identity]: Number(e.target.value) })}
            >
              <option value={0}>Main room</option>
              {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Room {n}
                </option>
              ))}
            </select>
          </li>
        ))}
        {students.length === 0 && <li className="text-[13px] text-white/50">No students in the class yet.</li>}
      </ul>
      <button
        type="button"
        disabled={busy || Object.values(assign).every((v) => !v)}
        className="lc-chip w-full"
        onClick={() => run({ action: "breakouts-open", count, assignments: Object.fromEntries(Object.entries(assign).filter(([, v]) => v > 0)) })}
      >
        Open rooms
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Host settings
// ---------------------------------------------------------------------------

const TOGGLES: { key: keyof RoomSettings; label: string; hint: string }[] = [
  { key: "locked", label: "Lock class", hint: "No one new can join" },
  { key: "waitingRoom", label: "Waiting room", hint: "Admit students one by one" },
  { key: "allowChat", label: "Allow chat", hint: "Students can send messages" },
  { key: "allowStudentUnmute", label: "Students can unmute", hint: "Turn off for lecture mode" },
  { key: "allowStudentVideo", label: "Students can start video", hint: "" },
  { key: "allowStudentScreenShare", label: "Students can share screen", hint: "" },
  { key: "captionsEnabled", label: "Live captions", hint: "Speech-to-text for everyone (Chrome and Edge)" },
  { key: "muteOnEntry", label: "Mute students when they join", hint: "" },
];

export function HostSettingsPanel({
  classId,
  settings,
  recordingAvailable,
}: {
  classId: string;
  settings: RoomSettings;
  recordingAvailable: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(key: keyof RoomSettings) {
    setBusy(key);
    const value = !settings[key];
    await control(classId, key === "locked" ? { action: "lock", locked: value } : { action: "settings", settings: { [key]: value } }).catch((e: Error) =>
      alert(e.message),
    );
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <section className="space-y-1">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-1.5 hover:bg-white/5">
            <span>
              <span className="block text-[13px] text-white">{t.label}</span>
              {t.hint && <span className="block text-[11px] text-white/45">{t.hint}</span>}
            </span>
            <input type="checkbox" className="lc-switch" checked={Boolean(settings[t.key])} disabled={busy === t.key} onChange={() => toggle(t.key)} />
          </label>
        ))}
      </section>

      <section className="space-y-2 border-t border-white/10 pt-3">
        <p className="text-[13px] font-semibold text-white">Cloud recording</p>
        {recordingAvailable ? (
          <button
            type="button"
            className={`lc-chip w-full ${settings.recording ? "is-danger" : ""}`}
            onClick={() => control(classId, { action: settings.recording ? "recording-stop" : "recording-start" }).catch((e: Error) => alert(e.message))}
          >
            {settings.recording ? "Stop recording" : "Start recording"}
          </button>
        ) : (
          <p className="text-[12px] text-white/50">Recording isn&apos;t set up on this server. See LIVE_CLASSES.md.</p>
        )}
      </section>

      <section className="space-y-2 border-t border-white/10 pt-3">
        <p className="text-[13px] font-semibold text-white">Message every room</p>
        <textarea className="lc-input min-h-14" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Shown to everyone, including breakout rooms" maxLength={500} />
        <button
          type="button"
          className="lc-chip"
          disabled={!message.trim()}
          onClick={() => control(classId, { action: "broadcast", text: message }).then(() => setMessage(""))}
        >
          Send to everyone
        </button>
      </section>
    </div>
  );
}
