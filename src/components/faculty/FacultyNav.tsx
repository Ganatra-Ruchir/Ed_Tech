"use client";

import { PortalSidebar, type PortalNavLink } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";

const TITLE = "Faculty Portal";

/**
 * The sidebar data must stay serializable across the server/client boundary.
 * Store the icon names as strings and resolve them on the client side.
 */
function buildLinks(isCC: boolean, pendingReviews: number): PortalNavLink[] {
  const links: PortalNavLink[] = [
    { href: "/faculty/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    {
      href: "/faculty/review",
      label: "Review Queue",
      icon: "Inbox",
      ...(pendingReviews > 0 ? { badge: pendingReviews } : {}),
    },
    { href: "/faculty/batches", label: "My Batches", icon: "Users" },
    { href: "/faculty/assignments", label: "Assignments", icon: "ClipboardList" },
    { href: "/faculty/students", label: "Students", icon: "GraduationCap" },
    { href: "/faculty/tests", label: "Tests", icon: "ClipboardList" },
    { href: "/faculty/announcements", label: "Announcements", icon: "Megaphone" },
    { href: "/faculty/reports", label: "Reports", icon: "FileText" },
  ];
  if (isCC) {
    links.push({ href: "/faculty/cohort", label: "Cohort Analytics", icon: "BarChart3" });
  }
  return links;
}

export function FacultySidebar({ isCC, pendingReviews }: { isCC: boolean; pendingReviews: number }) {
  return <PortalSidebar title={TITLE} layoutId="faculty-sidebar" links={buildLinks(isCC, pendingReviews)} />;
}

export function FacultyMobileNav({ isCC, pendingReviews }: { isCC: boolean; pendingReviews: number }) {
  return <PortalMobileNav title={TITLE} links={buildLinks(isCC, pendingReviews)} />;
}
