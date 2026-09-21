"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/TableToolbar";
import { Table, THead, Th, Tr, Td, TBody } from "@/components/Table";
import { TestPerformanceCharts, type ScorePoint } from "./TestPerformanceCharts";

export type BoardTest = {
  id: string;
  title: string;
  dueAt: Date | string | null;
  questionCount: number;
  score: number | null;
  maxScore: number | null;
  completed: boolean;
};

const TABS = ["All", "Upcoming", "Completed"] as const;

function fmtDate(d: Date | string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function TestsBoard({ tests }: { tests: BoardTest[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const counts = useMemo(
    () => ({
      All: tests.length,
      Upcoming: tests.filter((t) => !t.completed).length,
      Completed: tests.filter((t) => t.completed).length,
    }),
    [tests],
  );

  const filtered = tests.filter((t) => {
    if (tab === "Upcoming") return !t.completed;
    if (tab === "Completed") return t.completed;
    return true;
  });

  const scores: ScorePoint[] = tests
    .filter((t) => t.completed && t.score !== null && t.maxScore)
    .map((t) => ({
      name: t.title.length > 12 ? `${t.title.slice(0, 12)}…` : t.title,
      scorePct: Math.round(((t.score ?? 0) / (t.maxScore || 1)) * 100),
    }));
  const averagePct = scores.length > 0 ? scores.reduce((sum, s) => sum + s.scorePct, 0) / scores.length : 0;

  return (
    <div className="space-y-5">
      <TestPerformanceCharts scores={scores} averagePct={averagePct} />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <FilterChip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t} ({counts[t]})
          </FilterChip>
        ))}
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tests here" />
        ) : (
          <Table>
            <THead>
              <Th>Title</Th>
              <Th>Due Date</Th>
              <Th>Questions</Th>
              <Th>Status</Th>
              <Th>Score</Th>
              <Th></Th>
            </THead>
            <TBody>
              {filtered.map((t) => {
                const overdue = t.dueAt && new Date(t.dueAt).getTime() < now && !t.completed;
                return (
                  <Tr key={t.id}>
                    <Td className="font-medium text-zinc-900">{t.title}</Td>
                    <Td className="text-zinc-500">{fmtDate(t.dueAt)}</Td>
                    <Td className="text-zinc-500">{t.questionCount}</Td>
                    <Td>
                      {t.completed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">Past due</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Upcoming</span>
                      )}
                    </Td>
                    <Td className="text-zinc-500">{t.completed ? `${t.score ?? "-"} / ${t.maxScore ?? "-"}` : "-"}</Td>
                    <Td>
                      {t.completed ? (
                        <LinkButton href={`/student/tests/${t.id}`} size="sm" variant="secondary">
                          View
                        </LinkButton>
                      ) : overdue ? (
                        <span className="text-xs text-zinc-300">-</span>
                      ) : (
                        <LinkButton href={`/student/tests/${t.id}`} size="sm" className="!bg-[#ef5b3f] hover:!bg-[#d9472e]">
                          Start Test
                        </LinkButton>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
