"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-[#dfe3dc] bg-[#f7f8f5]/95 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#667085] backdrop-blur">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-2.5 font-medium", className)}>{children}</th>;
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.028, delayChildren: 0.02 } },
};

/**
 * Drop-in replacement for a plain <tbody> that staggers its <Tr> rows in on
 * mount/update. Rows read the parent's animate state automatically — no
 * per-row index bookkeeping needed.
 */
export function TBody({ children }: { children: ReactNode }) {
  return (
    <motion.tbody variants={listVariants} initial="hidden" animate="show">
      {children}
    </motion.tbody>
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
};

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.tr
      variants={rowVariants}
      onClick={onClick}
      whileHover={{ backgroundColor: "rgba(239,91,63,0.035)" }}
      transition={{ backgroundColor: { duration: 0.12 } }}
      className={cn("border-t border-[#eceee9]", onClick && "cursor-pointer", className)}
    >
      {children}
    </motion.tr>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-[#475467]", className)}>{children}</td>;
}
