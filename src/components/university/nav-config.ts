import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Megaphone,
  MessageSquare,
  ScrollText,
  UserCircle,
  Users,
} from "lucide-react";

/**
 * Shared by the desktop sidebar and the mobile drawer. Nav links store icon
 * *names* (strings) so they can cross the server → client boundary; they are
 * resolved to components here.
 */
export type PortalNavLink = { href: string; label: string; icon: string; badge?: number | string };
export type PortalNavGroup = { label?: string; links: PortalNavLink[] };

export const NAV_ICONS: Record<string, LucideIcon> = {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Megaphone,
  MessageSquare,
  ScrollText,
  UserCircle,
  Users,
};

export function navIcon(name: string): LucideIcon {
  return NAV_ICONS[name] ?? FileText;
}

/** Portal home links ("/student", "/admin") only match exactly; others match their subtree. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function toNavGroups(links: PortalNavLink[] | PortalNavGroup[]): PortalNavGroup[] {
  if (links.length === 0) return [];
  if ("links" in links[0]) return links as PortalNavGroup[];
  return [{ links: links as PortalNavLink[] }];
}
