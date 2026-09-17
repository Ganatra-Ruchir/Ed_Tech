import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  tone = "brand",
  className,
}: {
  /** 0-100 */
  value: number;
  tone?: "brand" | "success" | "warning" | "danger" | "auto";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const resolvedTone =
    tone === "auto" ? (clamped >= 75 ? "success" : clamped >= 50 ? "warning" : "danger") : tone;

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          resolvedTone === "brand" && "bg-indigo-600",
          resolvedTone === "success" && "bg-emerald-500",
          resolvedTone === "warning" && "bg-amber-500",
          resolvedTone === "danger" && "bg-rose-500",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
