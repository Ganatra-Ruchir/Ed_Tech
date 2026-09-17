import { cn } from "@/lib/cn";

const STYLES: Record<string, { pill: string; dot: string }> = {
  SUBMITTED: { pill: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", dot: "bg-indigo-500" },
  IN_REVIEW: { pill: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  APPROVED: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  NEEDS_REVISION: { pill: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { pill: "bg-zinc-100 text-zinc-700 ring-zinc-500/20", dot: "bg-zinc-400" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.pill,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {status.replaceAll("_", " ")}
    </span>
  );
}
