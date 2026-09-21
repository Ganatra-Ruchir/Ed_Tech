"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
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
  Menu,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Crest, BuildingSilhouette } from "./nav-primitives";
import type { PortalNavLink, PortalNavGroup } from "./PortalSidebar";

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

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function toGroups(links: PortalNavLink[] | PortalNavGroup[]): PortalNavGroup[] {
  if (links.length === 0) return [];
  if ("links" in links[0]) return links as PortalNavGroup[];
  return [{ links: links as PortalNavLink[] }];
}

export function PortalMobileNav({ title, links }: { title: string; links: PortalNavLink[] | PortalNavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = toGroups(links);

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#241719] px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <Crest />
          <div><p className="text-[13px] font-semibold text-white">{title}</p><p className="text-[9px] uppercase tracking-[0.12em] text-white/40">Learning Hub</p></div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
        >
          <Menu size={19} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-zinc-950/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#241719] text-white shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-2.5">
                  <Crest />
                  <div className="leading-tight">
                    <p className="text-[14px] font-semibold text-white">{title}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Learning Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                >
                  <X size={18} />
                </button>
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
                          onClick={() => setOpen(false)}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium",
                            active ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_#0b7a50]" : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                          )}
                        >
                          <Icon size={17} strokeWidth={2} />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
              <div className="relative overflow-hidden px-5 pb-5 pt-8">
                <BuildingSilhouette />
                <div className="relative border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className="text-white/70" />
                    <div className="leading-tight">
                      <p className="text-[12.5px] font-semibold text-white">Silver Oak University</p>
                      <p className="text-[10.5px] text-white/40">Academic workspace</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
