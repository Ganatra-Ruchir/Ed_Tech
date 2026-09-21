"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/Button";

/** Student-portal wrapper around the shared report-generation endpoint. It
 * exists alongside the generic GenerateReportButton so the student portal's
 * primary action carries the maroon Silver Oak theme (and the "Download PDF"
 * wording from the design reference) — the request contract is identical. */
export function DownloadReportButton({ studentId }: { studentId: string }) {
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
        body: JSON.stringify({ scope: "student", studentId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to generate report");
        return;
      }
      window.open(data.report.url, "_blank", "noopener,noreferrer");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={loading} size="sm" className="!bg-[#ef5b3f] hover:!bg-[#d9472e]">
        <FileDown size={14} /> {loading ? "Generating…" : "Download PDF"}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
