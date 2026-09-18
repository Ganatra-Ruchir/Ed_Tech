import { cn } from "@/lib/cn";
import type { RiskLevel } from "@/lib/risk";

const STYLES: Record<RiskLevel, { pill: string; dot: string; label: string }> = {
  NORMAL: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", label: "On track" },
  WATCH: { pill: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500", label: "Watch" },
  AT_RISK: { pill: "bg-orange-50 text-orange-800 ring-orange-600/25", dot: "bg-orange-500", label: "At risk" },
  CRITICAL: { pill: "bg-rose-50 text-rose-700 ring-rose-600/25", dot: "bg-rose-600", label: "Critical" },
};

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const s = STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        s.pill,
      )}
      title={score !== undefined ? `Risk score ${score}/100` : undefined}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
      {score !== undefined && <span className="tabular-nums opacity-60">{score}</span>}
    </span>
  );
}
