"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** Maroon-themed variants of the shared table toolbar primitives, so the
 * admin tables match the Silver Oak palette instead of the indigo defaults. */

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2.5">{children}</div>;
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10"
      />
    </div>
  );
}

export function AdminSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-md border border-zinc-200 bg-white py-1.5 pl-2.5 pr-7 text-[12.5px] font-medium text-zinc-700 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function AdminFilterChip({
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
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-[#ef5b3f]/[0.08] text-[#ef5b3f] ring-1 ring-inset ring-[#ef5b3f]/20"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

export function RiskPill({ atRisk }: { atRisk: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        atRisk
          ? "bg-rose-50 text-rose-700 ring-rose-600/20"
          : "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", atRisk ? "bg-rose-500" : "bg-emerald-500")} />
      {atRisk ? "At risk" : "On track"}
    </span>
  );
}
