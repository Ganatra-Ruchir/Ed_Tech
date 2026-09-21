"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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
  Sparkles,
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
  variant = "dark",
}: {
  title: string;
  layoutId: string;
  links: PortalNavLink[] | PortalNavGroup[];
  variant?: "dark" | "light";
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const groups = toGroups(links);

  return (
    <aside
      className={cn("sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col overflow-hidden border-r md:flex", variant === "light" ? "border-[#e5e7e1] bg-white text-[#17212b]" : "border-white/[0.07] bg-[#241417] text-white shadow-[10px_0_34px_rgba(45,15,20,0.08)]")}
    >
      <div className={cn("relative flex items-center gap-3 border-b px-5 py-[18px]", variant === "light" ? "border-[#e5e7e1]" : "border-white/[0.07]")}>
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}>
          <Crest />
        </motion.div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16, duration: 0.34, ease: [0.22, 1, 0.36, 1] }} className="min-w-0 leading-tight">
          <p className={cn("flex items-center gap-1.5 truncate text-[14px] font-semibold", variant === "light" ? "text-[#8f3032]" : "text-white")}>{title}<Sparkles size={11} className="animate-logo-spark text-[#d9a441]" /></p>
          <p className={cn("mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.12em]", variant === "light" ? "text-[#8f3032]/65" : "text-white/45")}>Learning Hub</p>
        </motion.div>
      </div>

      {variant === "dark" && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-[url('/campus-building.png')] bg-cover bg-center opacity-[0.08]" aria-hidden="true" />}
      {variant === "dark" && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-[#4f171e]/45" aria-hidden="true" />}

      <nav className="relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col gap-1">
            {group.label && (
              <p className={cn("mb-1.5 mt-1 px-3 text-[9px] font-semibold uppercase tracking-[0.15em]", variant === "light" ? "text-[#667085]" : "text-white/35")}>
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
                    active ? "text-white" : variant === "light" ? "text-[#344054] hover:text-[#8f3032]" : "text-white/68 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`${layoutId}-active-pill`}
                      className={cn("absolute inset-0 rounded-md", variant === "light" ? "bg-[#8f3032] shadow-[0_8px_18px_rgba(143,48,50,0.16)]" : "bg-[#8f1834] shadow-[inset_3px_0_0_#ff6b68,0_10px_24px_rgba(85,10,28,0.24)]")}
                      transition={{ type: "spring", stiffness: 500, damping: 42 }}
                    />
                  )}
                  {!active && (
                    <span className={cn("absolute inset-0 rounded-md transition-colors", variant === "light" ? "bg-transparent group-hover:bg-[#8f3032]/[0.06]" : "bg-white/0 group-hover:bg-white/[0.06]")} />
                  )}
                  <Icon size={17} strokeWidth={2} className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span className="relative z-10 truncate">{link.label}</span>
                  {link.badge !== undefined && (
                    <span
                      className={cn(
                        "relative z-10 ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        active ? "bg-white/15 text-white" : variant === "light" ? "bg-[#8f3032]/10 text-[#8f3032]" : "bg-white/10 text-white/75",
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

      <div className="relative z-10 overflow-hidden px-5 pb-5 pt-8">
        <BuildingSilhouette />
        <div className={cn("relative border-t pt-4", variant === "light" ? "border-[#e5e7e1]" : "border-white/[0.08]")}>
          <div className="flex items-center gap-2.5">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", variant === "light" ? "bg-[#8f3032]/10 text-[#8f3032]" : "bg-white/[0.07] text-[#f89582]")}><GraduationCap size={16} /></span>
            <div className="leading-tight">
              <p className={cn("text-[11.5px] font-semibold", variant === "light" ? "text-[#344054]" : "text-white/85")}>Silver Oak University</p>
              <p className={cn("mt-0.5 text-[10px]", variant === "light" ? "text-[#98a2b3]" : "text-white/35")}>Academic workspace</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
