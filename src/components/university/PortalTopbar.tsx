"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, LogOut, FileText, ClipboardList, Megaphone, Users, X, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/Avatar";

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

const SEARCH_DEBOUNCE_MS = 250;

export function PortalTopbar({
  userName,
  userRole,
  userImageUrl,
  searchEndpoint,
  searchPlaceholder = "Search…",
  notifications,
}: {
  userName: string;
  userRole: string;
  userImageUrl?: string | null;
  searchEndpoint: string;
  searchPlaceholder?: string;
  /** The notification bell. Passed as a slot so the layout can stream it in
   * behind <Suspense> without blocking the rest of the header. */
  notifications: ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();
  const showResults = searchOpen && trimmed.length >= 2;

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${searchEndpoint}?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        // Best-effort search — ignore aborted or transient failures.
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [trimmed, searchEndpoint]);

  // Global shortcuts are always on; outside-click listeners only while something is open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) setSearchOpen(false);
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen, menuOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function goTo(href: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#ebe5e1] bg-white px-4 py-3 sm:px-6 lg:px-7">
      <div className="min-w-0 flex-1">
        <div ref={searchBoxRef} className="relative w-full max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Global search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-[#e3ddd8] bg-[#fbfaf9] py-2.5 pl-9 pr-9 text-[13px] text-[#17212b] placeholder:text-[#98a2b3] focus:border-[#8f3032]/45 focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#8f3032]/8 sm:pr-16 [&::-webkit-search-cancel-button]:hidden"
          />
          {!query && (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center rounded border border-[#dfe3dc] bg-[#f7f8f5] px-1.5 py-0.5 text-[9px] font-semibold text-[#98a2b3] sm:flex">
              Ctrl K
            </kbd>
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#475467]"
            >
              <X size={13} />
            </button>
          )}

          {showResults && (
            <div className="animate-pop-in absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-[0_16px_40px_rgba(23,33,43,0.12)]">
              {searching && results.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-3 text-xs text-[#667085]">
                  <LoaderCircle size={13} className="animate-spin" /> Searching…
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-xs text-zinc-400">No matches for &ldquo;{trimmed}&rdquo;</p>
              ) : (
                <ul className={cn("max-h-80 divide-y divide-zinc-100 overflow-y-auto", searching && "opacity-60")}>
                  {results.map((r) => {
                    const Icon = KIND_ICON[r.kind] ?? FileText;
                    return (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          type="button"
                          onClick={() => goTo(r.href)}
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
            </div>
          )}
        </div>
      </div>

      {notifications}

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-[#f7f6f4]"
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

        {menuOpen && (
          <div className="animate-pop-in absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-md border border-[#dfe3dc] bg-white py-1 shadow-[0_16px_40px_rgba(23,33,43,0.12)]">
            <div className="border-b border-zinc-100 px-3.5 py-2.5">
              <p className="truncate text-[13px] font-medium text-zinc-900">{userName}</p>
              <p className="truncate text-[11px] text-zinc-400">{userRole}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
