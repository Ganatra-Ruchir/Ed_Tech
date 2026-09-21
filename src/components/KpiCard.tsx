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
    <div className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-[0_1px_2px_rgba(23,33,43,0.04)] transition-colors hover:border-[#cbd1c9]">
      <div className="flex items-center gap-1.5 text-[#667085]">
        {Icon && <Icon size={13} strokeWidth={2} />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <div
        className={cn(
          "mt-2 text-[26px] font-semibold leading-none",
          tone === "danger" && "text-rose-600",
          tone === "success" && "text-emerald-600",
          tone === "default" && "text-[#17212b]",
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
