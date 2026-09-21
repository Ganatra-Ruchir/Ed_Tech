import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTone = "maroon" | "emerald" | "sky" | "amber" | "rose" | "violet";

const TONES: Record<StatTone, string> = {
  maroon: "bg-[#ef5b3f]/10 text-[#d9472e]",
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
};

/**
 * Dashboard stat tile. `delta` is optional on purpose: when there is no prior
 * window to compare against, the caller passes nothing and no indicator is
 * shown, rather than a made-up number.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "maroon",
  delta,
  hint,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: StatTone;
  delta?: { text: string; direction: "up" | "down" | "flat" };
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-[0_1px_2px_rgba(23,33,43,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#667085]">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", TONES[tone])}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none text-[#17212b]">{value}</p>
      {delta ? (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-[11px] font-semibold",
            delta.direction === "up" && "text-emerald-600",
            delta.direction === "down" && "text-rose-600",
            delta.direction === "flat" && "text-zinc-400",
          )}
        >
          {delta.direction === "up" && <TrendingUp size={12} />}
          {delta.direction === "down" && <TrendingDown size={12} />}
          {delta.text}
        </p>
      ) : hint ? (
        <p className="mt-2 text-[11px] text-[#667085]">{hint}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-transparent">.</p>
      )}
    </div>
  );
}
