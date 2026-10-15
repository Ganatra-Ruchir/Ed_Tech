"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";
import { Crest } from "./nav-primitives";
import { isNavActive, navIcon, toNavGroups, type PortalNavGroup, type PortalNavLink } from "./nav-config";

export type { PortalNavGroup, PortalNavLink } from "./nav-config";

export function PortalSidebar({
  title,
  links,
}: {
  title: string;
  links: PortalNavLink[] | PortalNavGroup[];
}) {
  const pathname = usePathname();
  const groups = toNavGroups(links);

  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-white/[0.07] bg-[#241417] text-white md:flex">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-[18px]">
        <Crest />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-white">{title}</p>
          <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Learning Hub</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col gap-1">
            {group.label && (
              <p className="mb-1.5 mt-1 px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">{group.label}</p>
            )}
            {group.links.map((link) => {
              const active = isNavActive(pathname, link.href);
              const Icon = navIcon(link.icon);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                    active
                      ? "bg-[#8f1834] text-white shadow-[inset_3px_0_0_#ff6b68]"
                      : "text-white/68 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon size={17} strokeWidth={2} className="shrink-0" />
                  <span className="truncate">{link.label}</span>
                  {link.badge !== undefined && (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        active ? "bg-white/15 text-white" : "bg-white/10 text-white/75",
                      )}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.07] text-[#f89582]">
            <GraduationCap size={16} />
          </span>
          <div className="leading-tight">
            <p className="text-[11.5px] font-semibold text-white/85">Silver Oak University</p>
            <p className="mt-0.5 text-[10px] text-white/35">Academic workspace</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
