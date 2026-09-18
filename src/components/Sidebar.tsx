"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/Avatar";
import { ICONS, type IconName } from "@/components/icon-map";

export type SidebarLink = { href: string; label: string; icon: IconName; badge?: number | string };
export type SidebarGroup = { label?: string; links: SidebarLink[] };

const COLLAPSE_KEY = "sp_sidebar_collapsed";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function toGroups(links: SidebarLink[] | SidebarGroup[]): SidebarGroup[] {
  if (links.length === 0) return [];
  if ("links" in links[0]) return links as SidebarGroup[];
  return [{ links: links as SidebarLink[] }];
}

function NavList({
  groups,
  pathname,
  collapsed,
  layoutIdPrefix,
  onNavigate,
}: {
  groups: SidebarGroup[];
  pathname: string;
  collapsed?: boolean;
  layoutIdPrefix: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-2.5 py-3">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className="flex flex-col gap-px">
          {group.label && !collapsed && (
            <p className="mb-1 mt-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {group.label}
            </p>
          )}
          {group.links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = ICONS[link.icon];
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                title={collapsed ? link.label : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${layoutIdPrefix}-active-pill`}
                    className="absolute inset-0 rounded-md bg-white/[0.07]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon
                  size={16}
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 transition-colors",
                    active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                />
                {!collapsed && <span className="relative z-10 truncate">{link.label}</span>}
                {!collapsed && link.badge !== undefined && (
                  <span className="relative z-10 ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-zinc-300">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
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
  links: SidebarLink[] | SidebarGroup[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const AppIcon = ICONS[appIcon];
  const groups = toGroups(links);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore — per-viewer convenience only
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const brand = (
    <div className={cn("flex items-center gap-2 px-3.5 py-3.5", collapsed && "justify-center px-0")}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-white text-zinc-900">
        <AppIcon size={13} strokeWidth={2.4} />
      </span>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-semibold text-zinc-50">{appLabel}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-zinc-500">
            Silver Oak University
          </p>
        </div>
      )}
    </div>
  );

  const userFooter = (
    <div className={cn("flex items-center gap-2.5 border-t border-white/[0.06] px-3.5 py-3", collapsed && "justify-center px-0")}>
      <Avatar name={userName} size="sm" />
      {!collapsed && (
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium text-zinc-100">{userName}</p>
          <p className="truncate text-[11px] text-zinc-500">{userRole}</p>
        </div>
      )}
      {!collapsed && (
        <motion.button
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <LogOut size={14} />
        </motion.button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 224 }}
        transition={{ type: "spring", stiffness: 420, damping: 42 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-zinc-950 md:flex"
      >
        {brand}
        <NavList groups={groups} pathname={pathname} collapsed={collapsed} layoutIdPrefix="desktop" />
        <motion.button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          className={cn(
            "mx-2.5 mb-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-200",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          {!collapsed && "Collapse"}
        </motion.button>
        {userFooter}
      </motion.aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-950 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-white text-zinc-900">
            <AppIcon size={13} strokeWidth={2.4} />
          </span>
          <p className="text-[13px] font-semibold text-zinc-50">{appLabel}</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/[0.06]"
        >
          <Menu size={19} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-zinc-950/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-zinc-950 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                {brand}
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="mr-3 flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.06]"
                >
                  <X size={18} />
                </button>
              </div>
              <NavList
                groups={groups}
                pathname={pathname}
                layoutIdPrefix="mobile"
                onNavigate={() => setMobileOpen(false)}
              />
              {userFooter}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
