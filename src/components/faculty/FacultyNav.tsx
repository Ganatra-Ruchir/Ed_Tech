"use client";

import { PortalSidebar, type PortalNavLink } from "@/components/university/PortalSidebar";
import { PortalMobileNav } from "@/components/university/PortalMobileNav";

const TITLE = "Silver Oak";

/**
 * The sidebar data must stay serializable across the server/client boundary.
 * Store the icon names as strings and resolve them on the client side.
 */
function buildLinks(isCC: boolean, pendingReviews: number): PortalNavLink[] {
  const links: PortalNavLink[] = [
    { href: "/faculty/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    {
      href: "/faculty/batches",
      label: "My Courses",
      icon: "Users",
    },
    { href: "/faculty/students", label: "Students", icon: "GraduationCap" },
    { href: "/faculty/materials", label: "Study Materials", icon: "LibraryBig" },
    { href: "/faculty/tests", label: "Tests & Exams", icon: "ClipboardList" },
    {
      href: "/faculty/review",
      label: "Submissions",
      icon: "Inbox",
      ...(pendingReviews > 0 ? { badge: pendingReviews } : {}),
    },
    { href: "/faculty/announcements", label: "Announcements", icon: "Megaphone" },
    { href: "/faculty/attendance", label: "Attendance", icon: "CalendarCheck" },
    { href: "/messages", label: "Messages", icon: "MessageSquare" },
    { href: "/faculty/calendar", label: "Calendar", icon: "CalendarDays" },
    { href: "/faculty/reports", label: "Reports", icon: "FileText" },
    { href: "/faculty/profile", label: "My Profile", icon: "UserCircle" },
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
