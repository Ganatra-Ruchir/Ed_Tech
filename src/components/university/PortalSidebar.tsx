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
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Megaphone,
  MessageSquare,
  ScrollText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Crest, BuildingSilhouette } from "./nav-primitives";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  LibraryBig,
  UserCircle,
  Inbox,
  AlertTriangle,
  Megaphone,
  MessageSquare,
  FileText,
  ClipboardCheck,
  ClipboardList,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock,
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
      className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#241719] text-white md:flex"
    >
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-[18px]">
        <Crest />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-white">{title}</p>
          <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Learning Hub</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-5">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col gap-1">
            {group.label && (
              <p className="mb-1.5 mt-1 px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
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
                    "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active ? "text-white" : "text-white/60 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`${layoutId}-active-pill`}
                      className="absolute inset-0 rounded-md bg-white/[0.09] shadow-[inset_3px_0_0_#0b7a50]"
                      transition={{ type: "spring", stiffness: 500, damping: 42 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-md bg-white/0 transition-colors group-hover:bg-white/[0.06]" />
                  )}
                  <Icon size={17} strokeWidth={2} className="relative z-10" />
                  <span className="relative z-10 truncate">{link.label}</span>
                  {link.badge !== undefined && (
                    <span
                      className={cn(
                        "relative z-10 ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        active ? "bg-[#8f3032] text-white" : "bg-white/10 text-white/75",
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
        <div className="relative border-t border-white/[0.08] pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.07] text-[#f89582]"><GraduationCap size={16} /></span>
            <div className="leading-tight">
              <p className="text-[11.5px] font-semibold text-white/85">Silver Oak University</p>
              <p className="mt-0.5 text-[10px] text-white/35">Academic workspace</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
