"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select } from "@/components/Field";

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
    <Select
      defaultValue={value}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (e.target.value) params.set("batch", e.target.value);
        router.push(params.toString() ? `${pathname}?${params}` : pathname);
      }}
      className="w-auto text-xs"
    >
      <option value="">All my batches</option>
      {batches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </Select>
  );
}
