"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/Button";

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
      <Button onClick={handleClick} disabled={loading} size="sm">
        <FileDown size={14} /> {loading ? "Generating..." : "Generate PDF report"}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
