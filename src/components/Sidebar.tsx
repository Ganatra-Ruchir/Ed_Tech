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
    <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2.5 py-3">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
              active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            <Icon size={16} strokeWidth={2} className={active ? "text-indigo-600" : "text-zinc-400"} />
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
    <div className="flex items-center gap-2 px-3.5 py-3.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-zinc-900 text-white">
        <AppIcon size={13} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold text-zinc-900">{appLabel}</p>
        <p className="truncate text-[10px] uppercase tracking-wide text-zinc-400">
          Silver Oak University
        </p>
      </div>
    </div>
  );

  const userFooter = (
    <div className="flex items-center gap-2.5 border-t border-zinc-100 px-3.5 py-3">
      <Avatar name={userName} size="sm" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium text-zinc-800">{userName}</p>
        <p className="truncate text-[11px] text-zinc-400">{userRole}</p>
      </div>
      <button
        onClick={handleLogout}
        aria-label="Log out"
        title="Log out"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <LogOut size={14} />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/50 md:flex">
        {brand}
        <NavList links={links} pathname={pathname} />
        {userFooter}
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-zinc-900 text-white">
            <AppIcon size={13} strokeWidth={2.4} />
          </span>
          <p className="text-[13px] font-semibold text-zinc-900">{appLabel}</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100"
        >
          <Menu size={19} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="mr-3 flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
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
