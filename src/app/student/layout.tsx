import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        appLabel="Student Portal"
        appIcon="LayoutDashboard"
        userName={session.name}
        userRole="Student"
        links={[
          { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
          { href: "/student/stream", label: "Class Stream", icon: "Megaphone" },
          { href: "/student/reports", label: "My Report", icon: "FileText" },
        ]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
