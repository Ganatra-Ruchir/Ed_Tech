"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/Avatar";
import { ICONS, type IconName } from "@/components/icon-map";

export type SidebarLink = { href: string; label: string; icon: IconName };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavList({
  links,
  pathname,
  onNavigate,
}: {
  links: SidebarLink[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon size={17} strokeWidth={2} className={active ? "text-indigo-600" : "text-slate-400"} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  appLabel,
  appIcon,
  userName,
  userRole,
  links,
}: {
  appLabel: string;
  appIcon: IconName;
  userName: string;
  userRole: string;
  links: SidebarLink[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const AppIcon = ICONS[appIcon];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const brand = (
    <div className="flex items-center gap-2 px-4 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <AppIcon size={17} strokeWidth={2.2} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">{appLabel}</p>
        <p className="text-[11px] text-slate-400">Silver Oak University</p>
      </div>
    </div>
  );

  const userFooter = (
    <div className="flex items-center gap-2.5 border-t border-slate-100 px-4 py-3">
      <Avatar name={userName} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
        <p className="truncate text-xs text-slate-400">{userRole}</p>
      </div>
      <button
        onClick={handleLogout}
        aria-label="Log out"
        title="Log out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <LogOut size={16} />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {brand}
        <NavList links={links} pathname={pathname} />
        {userFooter}
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <AppIcon size={15} strokeWidth={2.2} />
          </span>
          <p className="text-sm font-semibold text-slate-900">{appLabel}</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <NavList links={links} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            {userFooter}
          </aside>
        </div>
      )}
    </>
  );
}
