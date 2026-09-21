"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, Bell, ChevronDown, LogOut, FileText, ClipboardList, Megaphone, Users, X, LoaderCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/Avatar";

type SearchResult = {
  kind: "submission" | "test" | "announcement" | "student" | "batch";
  id: string;
  title: string;
  meta: string;
  href: string;
};

type PortalNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

const KIND_ICON = {
  submission: FileText,
  test: ClipboardList,
  announcement: Megaphone,
  student: Users,
  batch: Users,
} as const;

export function PortalTopbar({
  userId,
  userName,
  userRole,
  userImageUrl,
  hasAlerts,
  searchEndpoint,
  searchPlaceholder = "Search…",
  notifications = [],
}: {
  userId: string;
  userName: string;
  userRole: string;
  userImageUrl?: string | null;
  hasAlerts: boolean;
  searchEndpoint: string;
  searchPlaceholder?: string;
  notifications?: PortalNotification[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<PortalNotification | null>(null);
  const [notificationStateReady, setNotificationStateReady] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const announcedNotificationIds = useRef<Set<string>>(new Set());
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const read = JSON.parse(window.localStorage.getItem(`portal-notifications:read:${userId}`) ?? "[]");
        const announced = JSON.parse(window.localStorage.getItem(`portal-notifications:announced:${userId}`) ?? "[]");
        setReadNotificationIds(new Set(Array.isArray(read) ? read.filter((id): id is string => typeof id === "string") : []));
        announcedNotificationIds.current = new Set(Array.isArray(announced) ? announced.filter((id): id is string => typeof id === "string") : []);
      } catch {
        setReadNotificationIds(new Set());
        announcedNotificationIds.current = new Set();
      }
      setNotificationStateReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [userId]);

  useEffect(() => {
    if (!notificationStateReady || toast) return;
    const first = notifications.find((notification) => !announcedNotificationIds.current.has(notification.id));
    if (!first) return;
    const handle = window.setTimeout(() => {
      for (const notification of notifications) {
        announcedNotificationIds.current.add(notification.id);
      }
      window.localStorage.setItem(
        `portal-notifications:announced:${userId}`,
        JSON.stringify([...announcedNotificationIds.current].slice(-100)),
      );
      setToast(first);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [notificationStateReady, notifications, toast, userId]);

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(handle);
  }, [toast]);

  function markNotificationRead(id: string) {
    setReadNotificationIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      window.localStorage.setItem(`portal-notifications:read:${userId}`, JSON.stringify([...next].slice(-100)));
      return next;
    });
  }

  function markAllNotificationsRead() {
    const next = new Set(notifications.map((notification) => notification.id));
    setReadNotificationIds(next);
    window.localStorage.setItem(`portal-notifications:read:${userId}`, JSON.stringify([...next].slice(-100)));
  }

  const showAlertDot = notificationStateReady
    ? notifications.some((notification) => !readNotificationIds.has(notification.id))
    : hasAlerts;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      const handle = window.setTimeout(() => setResults([]), 0);
      return () => window.clearTimeout(handle);
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${searchEndpoint}?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        // best-effort search — silently ignore transient failures
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query, searchEndpoint]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setSearchOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#dfe3dc] bg-[#f4f5f0]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="min-w-0 flex-1">
      <div ref={searchBoxRef} className="relative w-full max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
        <input
          ref={searchInputRef}
          aria-label="Global search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-[#dfe3dc] bg-white py-2.5 pl-9 pr-9 text-[13px] text-[#17212b] shadow-sm placeholder:text-[#98a2b3] focus:border-[#ef5b3f]/60 focus:outline-none focus:ring-3 focus:ring-[#ef5b3f]/10 sm:pr-16"
        />
        {!query && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center rounded border border-[#dfe3dc] bg-[#f7f8f5] px-1.5 py-0.5 text-[9px] font-semibold text-[#98a2b3] sm:flex">
            Ctrl K
          </kbd>
        )}
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#475467]"
          >
            <X size={13} />
          </button>
        )}

        <AnimatePresence>
          {searchOpen && query.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 top-full z-30 mt-2 w-full max-w-md overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-[0_16px_40px_rgba(23,33,43,0.12)]"
            >
              {searching ? (
                <p className="flex items-center gap-2 px-4 py-3 text-xs text-[#667085]"><LoaderCircle size={13} className="animate-spin" /> Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-xs text-zinc-400">No matches for &ldquo;{query}&rdquo;</p>
              ) : (
                <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto">
                  {results.map((r) => {
                    const Icon = KIND_ICON[r.kind];
                    return (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            setQuery("");
                            router.push(r.href);
                          }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#f4f5f0]"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/10 text-[#d9472e]">
                            <Icon size={13} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-zinc-900">{r.title}</span>
                            <span className="block truncate text-[11px] text-zinc-400">{r.meta}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      <button
        aria-label="Notifications"
        onClick={() => setNotificationsOpen((open) => !open)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent text-[#667085] hover:border-[#dfe3dc] hover:bg-white hover:text-[#17212b]"
      >
        <Bell size={17} />
        {showAlertDot && <span className="animate-signal-pulse absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ef5b3f] ring-2 ring-[#f4f5f0]" />}
      </button>
      <AnimatePresence>
        {notificationsOpen && <motion.div ref={notifRef} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute right-4 top-16 z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-[0_16px_40px_rgba(23,33,43,0.12)] sm:right-20"><div className="flex items-center justify-between border-b border-[#e7eae4] px-4 py-3"><span className="text-sm font-semibold text-[#17212b]">Notifications</span>{notifications.length > 0 && <button type="button" onClick={markAllNotificationsRead} className="text-[11px] font-semibold text-[#d9472e] hover:underline">Mark all read</button>}</div>{notifications.length === 0 ? <p className="px-4 py-4 text-xs text-[#667085]">You are all caught up.</p> : <ul className="max-h-[min(28rem,70vh)] divide-y divide-[#eceee9] overflow-y-auto">{notifications.map((notification) => { const isRead = readNotificationIds.has(notification.id); return <li key={notification.id}><button onClick={() => { markNotificationRead(notification.id); setNotificationsOpen(false); router.push(notification.href); }} className={`relative w-full px-4 py-3 text-left hover:bg-[#f4f5f0] ${isRead ? "bg-white" : "bg-[#fff8f5]"}`}>{!isRead && <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-[#ef5b3f]" />}<p className="text-xs font-semibold text-[#17212b]">{notification.title}</p><p className="mt-0.5 text-[11px] text-[#667085]">{notification.detail}</p></button></li>; })}</ul>}</motion.div>}
      </AnimatePresence>

      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-white"
        >
          <span className="rounded-md ring-1 ring-[#dfe3dc]">
            <Avatar name={userName} imageUrl={userImageUrl} />
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[13px] font-medium text-zinc-900">{userName}</span>
            <span className="block text-[11px] text-zinc-400">{userRole}</span>
          </span>
          <ChevronDown size={14} className={cn("hidden text-zinc-400 transition-transform sm:block", menuOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-md border border-[#dfe3dc] bg-white py-1 shadow-[0_16px_40px_rgba(23,33,43,0.12)]"
            >
              <div className="border-b border-zinc-100 px-3.5 py-2.5">
                <p className="truncate text-[13px] font-medium text-zinc-900">{userName}</p>
                <p className="truncate text-[11px] text-zinc-400">{userRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={14} /> Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
    <AnimatePresence>
      {toast && (
        <motion.button
          type="button"
          initial={{ opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          onClick={() => { const { href, id } = toast; markNotificationRead(id); setToast(null); router.push(href); }}
          className="fixed right-4 top-[4.75rem] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-[#dfe3dc] bg-white p-3 text-left shadow-[0_16px_40px_rgba(23,33,43,0.16)] sm:right-6"
        >
          <span className="flex items-start gap-2.5"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ef5b3f]/10 text-[#d9472e]"><Bell size={14} /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-wide text-[#d9472e]">New notification</span><span className="mt-0.5 block truncate text-[13px] font-semibold text-[#17212b]">{toast.title}</span><span className="mt-0.5 block truncate text-[11px] text-[#667085]">{toast.detail}</span></span><ArrowUpRight size={14} className="mt-1 shrink-0 text-[#98a2b3]" /></span>
        </motion.button>
      )}
    </AnimatePresence>
    </>
  );
}
