import {
  LayoutDashboard,
  Megaphone,
  FileText,
  Inbox,
  ClipboardList,
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";

// Server Components can't pass component references (functions) as props
// into a Client Component — React can't serialize them across that boundary.
// Layouts pass icon *names* instead; Sidebar (a Client Component) resolves
// the actual component from this map.
export const ICONS = {
  LayoutDashboard,
  Megaphone,
  FileText,
  Inbox,
  ClipboardList,
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
} as const;

export type IconName = keyof typeof ICONS;
