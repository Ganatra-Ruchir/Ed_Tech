"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

/**
 * A right-hand slide-over panel used for "record" detail views (Linear/Attio
 * style), with a real spring-driven slide and a backdrop fade. Rendered by an
 * `@modal` intercepting-route page, so it overlays the list page underneath
 * while the un-intercepted route stays a plain, shareable, refreshable URL.
 *
 * Closing plays the exit animation first (`open` flips to false) and only
 * calls `router.back()` once that animation completes, via AnimatePresence's
 * `onExitComplete` — otherwise Next would unmount the route instantly and the
 * exit transition would never be seen.
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
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
  }

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
  }, []);

  return (
    <AnimatePresence onExitComplete={() => router.back()}>
      {open && (
        <div key="drawer-root" className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-zinc-900/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`absolute inset-y-0 right-0 flex w-full ${widthClassName} flex-col border-l border-zinc-200 bg-white shadow-2xl`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <p className="truncate text-[13px] font-semibold text-zinc-900">{title}</p>
              <motion.button
                onClick={close}
                aria-label="Close"
                whileHover={{ scale: 1.08, backgroundColor: "rgba(24,24,27,0.06)" }}
                whileTap={{ scale: 0.92 }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700"
              >
                <X size={16} />
              </motion.button>
            </div>
            <motion.div
              className="flex-1 overflow-y-auto px-5 py-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.2 }}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
