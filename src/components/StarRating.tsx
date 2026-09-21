"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
}: {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={value ? `${value} out of 5 stars` : "Not rated"}>
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = star <= (value ?? 0);
        const icon = (
          <Star
            size={size}
            className={cn(selected ? "fill-amber-400 text-amber-400" : "text-zinc-300")}
          />
        );

        return readOnly ? (
          <span key={star} aria-hidden="true">{icon}</span>
        ) : (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            aria-label={`Rate ${star} out of 5 stars`}
            title={`${star} star${star === 1 ? "" : "s"}`}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
