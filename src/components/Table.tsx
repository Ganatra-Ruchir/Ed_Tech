import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Plain table primitives. Rows used to stagger in one-by-one through an
// animation library (~28ms per row), so a 200-row table took several seconds
// to finish appearing and re-animated on every refresh.

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-[#dfe3dc] bg-[#f7f8f5] text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#667085]">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-2.5 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

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
    <tr
      onClick={onClick}
      className={cn(
        "border-t border-[#eceee9] transition-colors duration-100 hover:bg-[#ef5b3f]/[0.035]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-[#475467]", className)}>{children}</td>;
}
