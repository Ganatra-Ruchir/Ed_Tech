"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Crest } from "./nav-primitives";
import { isNavActive, navIcon, toNavGroups, type PortalNavGroup, type PortalNavLink } from "./nav-config";

export function PortalMobileNav({ title, links }: { title: string; links: PortalNavLink[] | PortalNavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = toNavGroups(links);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#241719] px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <Crest />
          <div>
            <p className="text-[13px] font-semibold text-white">{title}</p>
            <p className="text-[9px] uppercase tracking-[0.12em] text-white/40">Learning Hub</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
        >
          <Menu size={19} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="animate-fade-in absolute inset-0 bg-zinc-950/50" onClick={() => setOpen(false)} />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#241719] text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2.5">
                <Crest />
                <div className="leading-tight">
                  <p className="text-[14px] font-semibold text-white">{title}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Learning Hub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
              {groups.map((group, gi) => (
                <div key={group.label ?? gi} className="flex flex-col gap-1">
                  {group.label && (
                    <p className="mb-0.5 mt-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">{group.label}</p>
                  )}
                  {group.links.map((link) => {
                    const active = isNavActive(pathname, link.href);
                    const Icon = navIcon(link.icon);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium",
                          active ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_#0b7a50]" : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <Icon size={17} strokeWidth={2} />
                        {link.label}
                        {link.badge !== undefined && (
                          <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/75">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-white/70" />
                <div className="leading-tight">
                  <p className="text-[12.5px] font-semibold text-white">Silver Oak University</p>
                  <p className="text-[10.5px] text-white/40">Academic workspace</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
