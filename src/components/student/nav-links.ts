import type { PortalNavLink } from "@/components/university/PortalSidebar";

/** Primary navigation for the student portal. The icon values are stored as
 * serializable strings so they can be passed through the Server -> Client
 * boundary without creating a React component object in the server payload. */
export const STUDENT_LINKS: PortalNavLink[] = [
  { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/student/stream", label: "Class Stream", icon: "Megaphone" },
  { href: "/student/reports", label: "My Report", icon: "FileText" },
  { href: "/student/submissions", label: "Submissions", icon: "ClipboardCheck" },
  { href: "/student/tests", label: "Tests", icon: "ClipboardList" },
];
