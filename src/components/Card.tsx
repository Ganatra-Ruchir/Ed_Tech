import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-md border border-[#dfe3dc] bg-white shadow-[0_1px_2px_rgba(23,33,43,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-[#cbd1c9] hover:shadow-[0_8px_24px_rgba(23,33,43,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-[#e7eae4] px-5 py-4", className)}>{children}</div>
  );
}
