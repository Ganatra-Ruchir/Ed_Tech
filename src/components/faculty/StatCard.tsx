import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTone = "maroon" | "emerald" | "sky" | "amber" | "rose" | "violet";

const TONES: Record<StatTone, { bg: string; chip: string }> = {
  maroon: { bg: "bg-[#6b1029]/[0.06]", chip: "bg-[#6b1029]/10 text-[#6b1029]" },
  emerald: { bg: "bg-emerald-50/80", chip: "bg-emerald-100 text-emerald-700" },
  sky: { bg: "bg-sky-50/80", chip: "bg-sky-100 text-sky-700" },
  amber: { bg: "bg-amber-50/80", chip: "bg-amber-100 text-amber-700" },
  rose: { bg: "bg-rose-50/80", chip: "bg-rose-100 text-rose-700" },
  violet: { bg: "bg-violet-50/80", chip: "bg-violet-100 text-violet-700" },
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
  const t = TONES[tone];
  return (
    <div className={cn("rounded-lg p-4", t.bg)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {Icon && (
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", t.chip)}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
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
        <p className="mt-1.5 text-[11px] text-zinc-400">{hint}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-transparent">.</p>
      )}
    </div>
  );
}
