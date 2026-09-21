"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Pin, Paperclip, Eye, CheckCircle2, MessageSquare, Send, Megaphone, Download,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { backgroundMeta, categoryMeta, type AnnouncementDTO } from "@/lib/announcement-types";

const TONE_PILL: Record<string, string> = {
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Google-Classroom-style stream. `canSeeInsights` shows seen/acknowledged
 * counts (faculty/admin view). Students instead get an Acknowledge button when
 * the announcement requires it. Every count comes from the DTO (real
 * receipts), never estimated.
 */
export function AnnouncementFeed({
  announcements,
  canSeeInsights,
}: {
  announcements: AnnouncementDTO[];
  canSeeInsights: boolean;
}) {
  if (announcements.length === 0) {
    return (
      <Card>
        <EmptyState icon={Megaphone} title="No announcements yet" description="Posts to the class stream will appear here." />
      </Card>
    );
  }
  const pinned = announcements.filter((a) => a.pinned);
  const rest = announcements.filter((a) => !a.pinned);
  return (
    <div className="space-y-3">
      {[...pinned, ...rest].map((a) => (
        <AnnouncementCard key={a.id} a={a} canSeeInsights={canSeeInsights} />
      ))}
    </div>
  );
}

function AnnouncementCard({ a, canSeeInsights }: { a: AnnouncementDTO; canSeeInsights: boolean }) {
  const router = useRouter();
  const cat = categoryMeta(a.category);
  const background = backgroundMeta(a.backgroundTheme);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [ackd, setAckd] = useState(a.viewerAcknowledged);

  async function acknowledge() {
    setBusy(true);
    try {
      const res = await fetch(`/api/announcements/${a.id}/acknowledge`, { method: "POST" });
      if (res.ok) {
        setAckd(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/announcements/${a.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment.trim() }),
      });
      if (res.ok) {
        setComment("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id={`announcement-${a.id}`} className={cn("scroll-mt-24 overflow-hidden", a.pinned && "ring-1 ring-[#ef5b3f]/20")}>
      {a.pinned && (
        <div className="flex items-center gap-1.5 border-b border-[#ef5b3f]/10 bg-[#ef5b3f]/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#ef5b3f]">
          <Pin size={11} /> Pinned
        </div>
      )}
      {a.bannerUrl && (
        // Banner URLs may use either the local file proxy or a deployment-provided Blob host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.bannerUrl}
          alt={`${a.title} banner`}
          className="h-36 w-full border-b border-black/5 object-cover sm:h-48"
          loading="lazy"
        />
      )}
      <div className={cn("p-4", background.surface)}>
        <div className="flex items-start gap-3">
          <Avatar name={a.facultyName} imageUrl={a.facultyImageUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", TONE_PILL[cat.tone])}>
                {cat.label}
              </span>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px]", background.dark ? "bg-white/10 text-zinc-200" : "bg-zinc-100 text-zinc-500")}>{a.batchName}</span>
              {a.requireAck && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Acknowledgment required
                </span>
              )}
              <span className={cn("ml-auto text-[11px]", background.dark ? "text-zinc-300" : "text-zinc-400")}>{fmtDateTime(a.createdAt)}</span>
            </div>
            <h3 className={cn("mt-1.5 text-[15px] font-semibold", background.dark ? "text-white" : "text-zinc-900")}>{a.title}</h3>
            <p className={cn("mt-1 whitespace-pre-wrap text-sm", background.dark ? "text-zinc-200" : "text-zinc-700")}>{a.body}</p>

            {a.attachment && (
              <a
                href={a.attachment.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm hover:border-[#ef5b3f]/30 hover:bg-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ef5b3f]/[0.08] text-[#ef5b3f]">
                  <Paperclip size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-zinc-800">{a.attachment.name}</span>
                  <span className="block text-[11px] text-zinc-400">{fmtSize(a.attachment.size)}</span>
                </span>
                <Download size={15} className="text-zinc-400" />
              </a>
            )}

            <div className={cn("mt-3 flex flex-wrap items-center gap-3 text-[12px]", background.dark ? "text-zinc-300" : "text-zinc-500")}>
              {canSeeInsights ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} /> {a.seenCount}/{a.audienceCount} seen
                  </span>
                  {a.requireAck && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={13} /> {a.acknowledgedCount} acknowledged
                    </span>
                  )}
                </>
              ) : (
                a.requireAck &&
                (ackd ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                    <CheckCircle2 size={14} /> Acknowledged
                  </span>
                ) : (
                  <button
                    onClick={acknowledge}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#ef5b3f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#d9472e] disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} /> Acknowledge
                  </button>
                ))
              )}
              {a.allowComments && (
                <button
                  onClick={() => setShowComments((v) => !v)}
                  className="inline-flex items-center gap-1 hover:text-zinc-800"
                >
                  <MessageSquare size={13} /> {a.comments.length} {a.comments.length === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>

            <AnimatePresence>
              {showComments && a.allowComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn("mt-3 overflow-hidden border-t pt-3", background.dark ? "border-white/10" : "border-zinc-100")}
                >
                  <ul className="space-y-2.5">
                    {a.comments.map((c) => (
                      <li key={c.id} className="flex items-start gap-2.5">
                        <Avatar name={c.authorName} imageUrl={c.authorImageUrl} size="sm" />
                        <div className="min-w-0 flex-1 rounded-lg bg-zinc-50 px-3 py-2">
                          <p className="text-[12px] font-medium text-zinc-800">
                            {c.authorName}{" "}
                            <span className="font-normal text-zinc-400">· {fmtDateTime(c.createdAt)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-zinc-700">{c.body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={postComment} className="mt-2.5 flex items-center gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write a reply…"
                      className="flex-1 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10"
                    />
                    <button
                      type="submit"
                      disabled={busy || !comment.trim()}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ef5b3f] text-white hover:bg-[#d9472e] disabled:opacity-50"
                      aria-label="Send reply"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Card>
  );
}
