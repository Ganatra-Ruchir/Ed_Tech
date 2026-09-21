"use client";

import { usePathname, useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

/** Date picker for the admin staff-attendance roster. `date` is the only
 * query param this page reads, so a fresh param set is enough. */
export function AttendanceDateFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-600 shadow-sm">
      <Calendar size={14} className="text-[#ef5b3f]" />
      <span className="sr-only">Filter by date</span>
      <input
        type="date"
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams();
          if (e.target.value) params.set("date", e.target.value);
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="cursor-pointer bg-transparent text-[13px] font-medium text-zinc-800 focus:outline-none"
      />
    </label>
  );
}
