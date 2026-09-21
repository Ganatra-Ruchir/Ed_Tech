import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-lg border border-[#e5e1dc] bg-white shadow-[0_1px_2px_rgba(65,35,35,0.035),0_10px_30px_rgba(65,35,35,0.035)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[#d9cec8] hover:shadow-[0_14px_38px_rgba(65,35,35,0.075)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-[#eee9e5] px-5 py-4", className)}>{children}</div>
  );
}
