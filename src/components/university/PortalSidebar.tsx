"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  UserCircle,
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Crest, BuildingSilhouette } from "./nav-primitives";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  UserCircle,
  Inbox,
  AlertTriangle,
  Megaphone,
  FileText,
  ClipboardCheck,
  ClipboardList,
  Users,
  GraduationCap,
  Building2,
  BarChart3,
  ScrollText,
};

export type PortalNavLink = { href: string; label: string; icon: string; badge?: number | string };
export type PortalNavGroup = { label?: string; links: PortalNavLink[] };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function toGroups(links: PortalNavLink[] | PortalNavGroup[]): PortalNavGroup[] {
  if (links.length === 0) return [];
  if ("links" in links[0]) return links as PortalNavGroup[];
  return [{ links: links as PortalNavLink[] }];
}

export function PortalSidebar({
  title,
  layoutId,
  links,
}: {
  title: string;
  layoutId: string;
  links: PortalNavLink[] | PortalNavGroup[];
}) {
  const pathname = usePathname();
  const groups = toGroups(links);

  return (
    <aside
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden text-white md:flex"
      style={{ background: "linear-gradient(180deg, #5c0f24 0%, #6b1029 45%, #56091f 100%)" }}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Crest />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-semibold text-white">{title}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-white/60">Silver Oak University</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col gap-1">
            {group.label && (
              <p className="mb-0.5 mt-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {group.label}
              </p>
            )}
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = ICONS[link.icon] ?? FileText;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                    active ? "text-[#6b1029]" : "text-white/85 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`${layoutId}-active-pill`}
                      className="absolute inset-0 rounded-lg bg-white shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 42 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-lg bg-white/0 transition-colors group-hover:bg-white/10" />
                  )}
                  <Icon size={17} strokeWidth={2} className="relative z-10" />
                  <span className="relative z-10 truncate">{link.label}</span>
                  {link.badge !== undefined && (
                    <span
                      className={cn(
                        "relative z-10 ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        active ? "bg-[#6b1029]/10 text-[#6b1029]" : "bg-white/15 text-white",
                      )}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative overflow-hidden px-5 pb-5 pt-8">
        <BuildingSilhouette />
        <div className="relative border-t border-white/10 pt-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-white/45">LEARN &nbsp;•&nbsp; GROW &nbsp;•&nbsp; BELONG</p>
          <div className="mt-3 flex items-center gap-2">
            <GraduationCap size={18} className="text-white/70" />
            <div className="leading-tight">
              <p className="text-[12.5px] font-semibold text-white">Silver Oak University</p>
              <p className="text-[10.5px] text-white/50">Knowledge for a Brighter Tomorrow</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
