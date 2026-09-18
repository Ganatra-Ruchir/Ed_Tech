"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/components/faculty/faculty-format";

export type TestRow = {
  id: string;
  title: string;
  batchName: string;
  questions: number;
  responses: number;
  /** ISO string or null. */
  dueAt: string | null;
  published: boolean;
};

/**
 * The schema models exactly two states — a test either has a `publishedAt`
 * timestamp or it doesn't — so the tabs stop at All / Drafts / Published.
 */
const TABS = [
  { key: "all", label: "All Tests" },
  { key: "drafts", label: "Drafts" },
  { key: "published", label: "Published" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TestsBoard({ tests }: { tests: TestRow[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(
    () => ({
      all: tests.length,
      drafts: tests.filter((t) => !t.published).length,
      published: tests.filter((t) => t.published).length,
    }),
    [tests],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      if (tab === "drafts" && t.published) return false;
      if (tab === "published" && !t.published) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.batchName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tests, tab, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-[#6b1029] text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
          <div className="relative min-w-[190px] flex-1 sm:max-w-sm">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests by title or batch…"
              className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#6b1029]/40 focus:outline-none focus:ring-2 focus:ring-[#6b1029]/10"
            />
          </div>
          <p className="ml-auto text-[12px] text-zinc-400">
            {rows.length} of {tests.length} tests
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No tests here"
            description={tests.length === 0 ? "Create your first test to get started." : "Try a different tab or search."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/95 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Title</th>
                  <th className="px-3 py-2.5 font-medium">Batch</th>
                  <th className="px-3 py-2.5 font-medium">Questions</th>
                  <th className="px-3 py-2.5 font-medium">Responses</th>
                  <th className="px-3 py-2.5 font-medium">Due Date</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-3 py-2.5 text-[13px] font-medium text-zinc-900">{t.title}</td>
                    <td className="px-3 py-2.5 text-[13px] text-zinc-500">{t.batchName}</td>
                    <td className="px-3 py-2.5 text-[13px] text-zinc-700">{t.questions}</td>
                    <td className="px-3 py-2.5 text-[13px] text-zinc-700">{t.responses}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-zinc-500">{fmtDate(t.dueAt)}</td>
                    <td className="px-3 py-2.5">
                      {t.published ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/faculty/tests/${t.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-[#6b1029]/20 bg-[#6b1029]/[0.06] px-2.5 py-1 text-xs font-medium text-[#6b1029] transition-colors hover:bg-[#6b1029] hover:text-white"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
