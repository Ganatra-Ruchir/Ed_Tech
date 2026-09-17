"use client";

import { useRouter, usePathname } from "next/navigation";

export function BatchFilterSelect({
  batches,
  value,
}: {
  batches: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      defaultValue={value}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (e.target.value) params.set("batch", e.target.value);
        router.push(params.toString() ? `${pathname}?${params}` : pathname);
      }}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
    >
      <option value="">All my batches</option>
      {batches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
