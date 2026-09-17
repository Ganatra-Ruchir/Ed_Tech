import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar, type SidebarLink } from "@/components/Sidebar";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "FACULTY") {
    redirect("/login");
  }

  const links: SidebarLink[] = [
    { href: "/faculty", label: "Review Queue", icon: "Inbox" },
    { href: "/faculty/batches", label: "Batches", icon: "Users" },
    { href: "/faculty/tests", label: "Tests", icon: "ClipboardList" },
    { href: "/faculty/announcements", label: "Announcements", icon: "Megaphone" },
  ];
  if (session.isCC) {
    links.push({ href: "/faculty/cohort", label: "Cohort Analytics", icon: "BarChart3" });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        appLabel="Faculty Portal"
        appIcon="ClipboardCheck"
        userName={session.name}
        userRole={session.isCC ? "Faculty · Course Coordinator" : "Faculty"}
        links={links}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
