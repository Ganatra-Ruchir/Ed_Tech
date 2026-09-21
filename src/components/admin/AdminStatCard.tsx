import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const TONES = {
  maroon: "bg-[#ef5b3f]/[0.08] text-[#ef5b3f]",
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
    <div className="group rounded-md border border-[#dfe3dc] bg-white p-4 shadow-[0_1px_2px_rgba(23,33,43,0.04)] transition-[border-color,box-shadow] hover:border-[#cbd1c9] hover:shadow-[0_8px_24px_rgba(23,33,43,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#667085]">{label}</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-tight text-[#17212b]">{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", TONES[tone])}>
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      {(delta || footnote) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta && (
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {delta}
            </span>
          )}
          {footnote && <span className="text-[11px] text-[#667085]">{footnote}</span>}
        </div>
      )}
    </div>
  );
}
