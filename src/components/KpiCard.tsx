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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "text-2xl font-semibold tracking-tight",
            tone === "danger" && "text-rose-600",
            tone === "success" && "text-emerald-600",
            tone === "default" && "text-slate-900",
          )}
        >
          {value}
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              tone === "danger" && "bg-rose-50 text-rose-600",
              tone === "success" && "bg-emerald-50 text-emerald-600",
              tone === "default" && "bg-indigo-50 text-indigo-600",
            )}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
      {progress !== undefined && (
        <ProgressBar
          value={progress}
          tone={tone === "default" ? "auto" : tone}
          className="mt-2.5"
        />
      )}
    </div>
  );
}
