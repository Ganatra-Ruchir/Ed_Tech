import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.02] transition-shadow duration-150 hover:shadow-md hover:shadow-zinc-900/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-zinc-100 px-4 py-3", className)}>{children}</div>
  );
}
