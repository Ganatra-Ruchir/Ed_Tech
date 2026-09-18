import type { PortalNavGroup } from "@/components/university/PortalSidebar";

/** Primary navigation for the admin portal. Icon names are stored as strings so
 * the sidebar can safely resolve them on the client side and avoid passing
 * React component functions across the server/client boundary. */
export const ADMIN_LINKS: PortalNavGroup[] = [
  {
    links: [{ href: "/admin", label: "Dashboard", icon: "LayoutDashboard" }],
  },
  {
    label: "Directory",
    links: [
      { href: "/admin/students", label: "Students", icon: "Users" },
      { href: "/admin/faculty", label: "Faculty", icon: "GraduationCap" },
      { href: "/admin/batches", label: "Batches", icon: "Building2" },
    ],
  },
  {
    label: "Insights",
    links: [
      { href: "/admin/analytics", label: "Analytics", icon: "BarChart3" },
      { href: "/admin/reports", label: "Reports", icon: "FileText" },
      { href: "/admin/audit", label: "Audit Logs", icon: "ScrollText" },
    ],
  },
  {
    label: "Account",
    links: [{ href: "/admin/profile", label: "My Profile", icon: "UserCircle" }],
  },
];