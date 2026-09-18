"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, Bell, ChevronDown, LogOut, FileText, ClipboardList, Megaphone, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";

type SearchResult = {
  kind: "submission" | "test" | "announcement" | "student" | "batch";
  id: string;
  title: string;
  meta: string;
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
  userName,
  userRole,
  hasAlerts,
  searchEndpoint,
  searchPlaceholder = "Search…",
  notifications = [],
}: {
  userName: string;
  userRole: string;
  hasAlerts: boolean;
  searchEndpoint: string;
  searchPlaceholder?: string;
  notifications?: { title: string; detail: string; href: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`${searchEndpoint}?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        // best-effort search — silently ignore transient failures
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query, searchEndpoint]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
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

  const initials = userName
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div ref={searchBoxRef} className="relative min-w-0 flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder={searchPlaceholder}
          className="w-full max-w-md rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-8 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#6b1029]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b1029]/10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
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
              className="absolute left-0 top-full z-30 mt-1.5 w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
            >
              {results.length === 0 ? (
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
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-zinc-50"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#6b1029]/[0.08] text-[#6b1029]">
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

      <button
        aria-label="Notifications"
        onClick={() => setNotificationsOpen((open) => !open)}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Bell size={17} />
        {hasAlerts && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />}
      </button>
      <AnimatePresence>
        {notificationsOpen && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute right-20 top-14 z-40 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl"><div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Notifications</div>{notifications.length === 0 ? <p className="px-4 py-4 text-xs text-zinc-500">You are all caught up.</p> : <ul className="divide-y divide-zinc-100">{notifications.map((notification) => <li key={`${notification.href}-${notification.title}`}><button onClick={() => { setNotificationsOpen(false); router.push(notification.href); }} className="w-full px-4 py-3 text-left hover:bg-zinc-50"><p className="text-xs font-semibold text-zinc-900">{notification.title}</p><p className="mt-0.5 text-[11px] text-zinc-500">{notification.detail}</p></button></li>)}</ul>}</motion.div>}
      </AnimatePresence>

      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-zinc-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6b1029] text-xs font-semibold text-white">
            {initials}
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
              className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
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
    </div>
  );
}
