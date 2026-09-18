import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const TONES = {
  maroon: "bg-[#6b1029]/[0.08] text-[#6b1029]",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

export type StatTone = keyof typeof TONES;

/**
 * Headline figure card for the admin dashboard. `delta` is optional and is
 * only ever passed a value the caller computed from real rows — there is no
 * placeholder percentage.
 */
export function AdminStatCard({
  label,
  value,
  icon: Icon,
  tone = "maroon",
  delta,
  footnote,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  delta?: string;
  footnote?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/[0.02] transition-colors hover:border-zinc-300">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
          <p className="mt-0.5 text-[26px] font-bold leading-tight tracking-tight text-zinc-900">{value}</p>
        </div>
      </div>
      {(delta || footnote) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta && (
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {delta}
            </span>
          )}
          {footnote && <span className="text-[11px] text-zinc-400">{footnote}</span>}
        </div>
      )}
    </div>
  );
}
