"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props =
  | { scope: "student"; studentId: string; batchId?: undefined }
  | { scope: "batch"; batchId: string; studentId?: undefined };

export function GenerateReportButton(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate report");
        return;
      }
      window.open(data.report.url, "_blank");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? "Generating..." : "Generate PDF report"}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
