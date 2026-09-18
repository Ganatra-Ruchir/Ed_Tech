import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/Card";
import { RiskBadge } from "@/components/RiskBadge";
import type { RiskAssessment } from "@/lib/risk";

/**
 * Renders a risk assessment with its full derivation — every contributing
 * signal, the arithmetic behind it, and the points it added. Nothing here is
 * inferred or estimated; if a number is on screen, `risk.reasons` explains it.
 */
export function RiskPanel({ risk }: { risk: RiskAssessment }) {
  const m = risk.metrics;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {risk.level === "NORMAL" ? (
            <CheckCircle2 size={15} className="text-emerald-600" />
          ) : (
            <AlertTriangle size={15} className="text-amber-600" />
          )}
          <h2 className="text-[13px] font-semibold text-zinc-900">Academic risk</h2>
        </div>
        <RiskBadge level={risk.level} score={risk.score} />
      </div>

      {risk.reasons.length === 0 ? (
        <p className="px-4 py-4 text-sm text-zinc-500">
          No risk signals detected. Assignments, attendance and marks are all within thresholds.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {risk.reasons.map((r) => (
            <li key={r.code} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-zinc-900">{r.label}</p>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">
                  +{r.points}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{r.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          <Info size={12} /> Why this score
        </p>
        <p className="text-xs text-zinc-600">
          Risk score is the sum of the signals above, capped at 100. Thresholds: 18+ Watch, 35+ At risk, 60+ Critical.
          Current total: <span className="font-semibold tabular-nums">{risk.score}</span>.
        </p>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          <Stat label="Assignments due" value={String(m.assignmentsDue)} />
          <Stat label="Submitted" value={String(m.submitted)} />
          <Stat label="Missing" value={String(m.missing)} />
          <Stat label="Late" value={String(m.late)} />
          <Stat label="Needs revision" value={String(m.needsRevision)} />
          <Stat label="Completion" value={`${m.completionRate.toFixed(0)}%`} />
          <Stat
            label="Attendance"
            value={m.attendancePct === null ? "No data" : `${m.attendancePct.toFixed(0)}% (${m.attendanceSessions})`}
          />
          <Stat label="Avg score" value={m.avgScorePct === null ? "No data" : `${m.avgScorePct.toFixed(0)}%`} />
          <Stat
            label="Marks trend"
            value={
              m.scoreDeltaPct === null
                ? "Not enough data"
                : `${m.scoreDeltaPct >= 0 ? "+" : ""}${m.scoreDeltaPct.toFixed(0)}%`
            }
          />
        </dl>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-zinc-400">{label}</dt>
      <dd className="font-medium tabular-nums text-zinc-700">{value}</dd>
    </div>
  );
}
