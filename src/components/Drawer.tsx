"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const EXIT_MS = 180;

/**
 * Right-hand slide-over for "record" detail views, rendered by an `@modal`
 * intercepting route so it overlays the list page underneath while the
 * un-intercepted URL stays shareable and refreshable.
 *
 * Closing plays a short CSS exit, then calls `router.back()` to pop the
 * intercepted route.
 */
export function Drawer({
  title,
  children,
  widthClassName = "max-w-2xl",
}: {
  title?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => router.back(), EXIT_MS);
  }, [router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 bg-zinc-900/35 transition-opacity",
          closing ? "opacity-0" : "animate-drawer-backdrop-in",
        )}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform ease-in",
          widthClassName,
          closing ? "translate-x-full" : "animate-drawer-slide-in",
        )}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <p className="truncate text-[13px] font-semibold text-zinc-900">{title}</p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900/[0.06] hover:text-zinc-700"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
