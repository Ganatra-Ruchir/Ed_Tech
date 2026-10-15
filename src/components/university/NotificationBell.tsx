"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bell } from "lucide-react";
import type { PortalNotification } from "@/lib/portal-notifications";

function readIdSet(key: string): Set<string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...ids].slice(-100)));
  } catch {
    // Storage full or blocked — read state just won't persist.
  }
}

/** Placeholder rendered while the notification queries stream in. */
export function NotificationBellFallback() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#98a2b3]" aria-hidden="true">
      <Bell size={17} />
    </span>
  );
}

export function NotificationBell({ userId, notifications }: { userId: string; notifications: PortalNotification[] }) {
  const router = useRouter();
  const readKey = `portal-notifications:read:${userId}`;
  const announcedKey = `portal-notifications:announced:${userId}`;
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<PortalNotification | null>(null);
  const [readIds, setReadIds] = useState<Set<string> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load persisted read state once, and pop a toast for the first notification
  // this browser hasn't announced yet.
  useEffect(() => {
    const read = readIdSet(readKey);
    const announced = readIdSet(announcedKey);
    const fresh = notifications.find((n) => !announced.has(n.id)) ?? null;
    if (fresh) {
      for (const n of notifications) announced.add(n.id);
      writeIdSet(announcedKey, announced);
    }
    // One deferred update so this doesn't cascade into a second synchronous render.
    const handle = window.setTimeout(() => {
      setReadIds(read);
      if (fresh) setToast(fresh);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [notifications, readKey, announcedKey]);

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(handle);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markRead(id: string) {
    setReadIds((current) => {
      const next = new Set(current ?? []);
      next.add(id);
      writeIdSet(readKey, next);
      return next;
    });
  }

  function markAllRead() {
    const next = new Set(notifications.map((n) => n.id));
    setReadIds(next);
    writeIdSet(readKey, next);
  }

  function openNotification(n: PortalNotification) {
    markRead(n.id);
    setOpen(false);
    setToast(null);
    router.push(n.href);
  }

  const hasUnread = notifications.some((n) => !(readIds?.has(n.id) ?? false));

  return (
    <>
      <div ref={wrapperRef} className="contents">
        <button
          type="button"
          aria-label="Notifications"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent text-[#667085] hover:border-[#dfe3dc] hover:bg-white hover:text-[#17212b]"
        >
          <Bell size={17} />
          {hasUnread && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ef5b3f] ring-2 ring-white" />}
        </button>
        {open && (
          <div className="animate-pop-in absolute right-4 top-16 z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-[0_16px_40px_rgba(23,33,43,0.12)] sm:right-20">
            <div className="flex items-center justify-between border-b border-[#e7eae4] px-4 py-3">
              <span className="text-sm font-semibold text-[#17212b]">Notifications</span>
              {notifications.length > 0 && (
                <button type="button" onClick={markAllRead} className="text-[11px] font-semibold text-[#d9472e] hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-4 text-xs text-[#667085]">You are all caught up.</p>
            ) : (
              <ul className="max-h-[min(28rem,70vh)] divide-y divide-[#eceee9] overflow-y-auto">
                {notifications.map((n) => {
                  const isRead = readIds?.has(n.id) ?? false;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={`relative w-full px-4 py-3 text-left hover:bg-[#f4f5f0] ${isRead ? "bg-white" : "bg-[#fff8f5]"}`}
                      >
                        {!isRead && <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-[#ef5b3f]" />}
                        <p className="text-xs font-semibold text-[#17212b]">{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#667085]">{n.detail}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {toast && (
        <button
          type="button"
          onClick={() => openNotification(toast)}
          className="animate-pop-in fixed right-4 top-[4.75rem] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-[#dfe3dc] bg-white p-3 text-left shadow-[0_16px_40px_rgba(23,33,43,0.16)] sm:right-6"
        >
          <span className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/10 text-[#d9472e]">
              <Bell size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#d9472e]">New notification</span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold text-[#17212b]">{toast.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[#667085]">{toast.detail}</span>
            </span>
            <ArrowUpRight size={14} className="mt-1 shrink-0 text-[#98a2b3]" />
          </span>
        </button>
      )}
    </>
  );
}
