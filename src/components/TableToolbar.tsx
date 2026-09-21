"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A thin filter/search bar for above a Table, in the Attio style — a
 * left-aligned search box, optional filter chips, and right-aligned actions.
 * Purely presentational: parent owns the search/filter state and passes it
 * down as controlled props.
 */
export function TableToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  filters,
  actions,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
      {onSearchChange && (
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#ef5b3f] focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/15"
          />
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-1.5">{filters}</div>}
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[#ef5b3f]/[0.07] px-2.5 py-1 text-xs font-medium text-[#ef5b3f] ring-1 ring-inset ring-[#ef5b3f]/20"
          : "rounded-full px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      }
    >
      {children}
    </button>
  );
}
