"use client";

import { usePathname, useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

/** Semester picker for the admin dashboard. Semesters come from the distinct
 * `Batch.semester` values actually present in the database. */
export function SemesterFilter({ semesters, value }: { semesters: string[]; value: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  if (semesters.length === 0) return null;

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-600 shadow-sm">
      <Calendar size={14} className="text-[#ef5b3f]" />
      <span className="sr-only">Filter by semester</span>
      <select
        value={value ?? ""}
        onChange={(e) => {
          // `semester` is the only query param this page reads, so a fresh
          // param set is enough — and it avoids a useSearchParams() Suspense
          // boundary requirement in the dashboard tree.
          const params = new URLSearchParams();
          if (e.target.value) params.set("semester", e.target.value);
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="cursor-pointer bg-transparent pr-1 text-[13px] font-medium text-zinc-800 focus:outline-none"
      >
        <option value="">All semesters</option>
        {semesters.map((s) => (
          <option key={s} value={s}>
            Semester {s}
          </option>
        ))}
      </select>
    </label>
  );
}
