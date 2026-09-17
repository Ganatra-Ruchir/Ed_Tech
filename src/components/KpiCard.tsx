import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ProgressBar";

export function KpiCard({
  label,
  value,
  tone = "default",
  icon: Icon,
  progress,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
  icon?: LucideIcon;
  /** 0-100, renders a thin progress bar under the value */
  progress?: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3.5 transition-colors hover:border-zinc-300">
      <div className="flex items-center gap-1.5 text-zinc-400">
        {Icon && <Icon size={13} strokeWidth={2} />}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={cn(
          "mt-1.5 text-[22px] font-semibold tracking-tight",
          tone === "danger" && "text-rose-600",
          tone === "success" && "text-emerald-600",
          tone === "default" && "text-zinc-900",
        )}
      >
        {value}
      </div>
      {progress !== undefined && (
        <ProgressBar value={progress} tone={tone === "default" ? "auto" : tone} className="mt-2.5" />
      )}
    </div>
  );
}
