import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Plain CSS press/hover feedback. These used to be animation-library
// components, which shipped the animation runtime to every page and attached
// gesture listeners to every button in the app.

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#17212b] text-white shadow-sm hover:bg-[#263441] disabled:bg-zinc-300",
  secondary:
    "border border-[#d6dbd3] bg-white text-[#344054] shadow-sm hover:border-[#bfc6bc] hover:bg-[#f8f9f6] disabled:text-zinc-300",
  ghost: "text-[#475467] hover:bg-[#e9ece6] disabled:text-zinc-300",
  danger: "bg-rose-600 text-white hover:bg-rose-500 disabled:bg-rose-200",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-3.5 py-2 text-sm gap-2",
};

const base =
  "inline-flex items-center justify-center rounded-md font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef5b3f]/40";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, VARIANTS[variant], SIZES[size], className)}>
      {children}
    </Link>
  );
}
