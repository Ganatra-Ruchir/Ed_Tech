"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

/**
 * Semester picker driven by the `?semester=` search param, so the page stays
 * a server component and the filter survives a refresh or a shared link.
 * Options come from the semesters that actually exist on the faculty's
 * batches — there is no hardcoded semester list.
 */
export function SemesterSelect({ semesters, value }: { semesters: string[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (semesters.length === 0) return null;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set("semester", e.target.value);
          else params.delete("semester");
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="appearance-none rounded-md border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-zinc-700 focus:border-[#ef5b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#ef5b3f]/10"
      >
        <option value="">All semesters</option>
        {semesters.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
      />
    </div>
  );
}
