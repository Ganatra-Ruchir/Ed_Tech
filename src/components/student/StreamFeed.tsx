"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Megaphone, Search, Clock, FileText } from "lucide-react";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/TableToolbar";

export type StreamPost = {
  id: string;
  title: string;
  body: string;
  facultyName: string;
  batchName: string;
  /** Pre-formatted on the server so the client never re-derives "now" and
   * risks a hydration mismatch. */
  postedOn: string;
  relative: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
};

export function StreamFeed({ posts }: { posts: StreamPost[] }) {
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState<string>("ALL");

  const batches = useMemo(() => {
    const names = new Set(posts.map((p) => p.batchName));
    return Array.from(names).sort();
  }, [posts]);

  const filtered = posts.filter((p) => {
    if (batch !== "ALL" && p.batchName !== batch) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#6b1029]/40 focus:outline-none focus:ring-2 focus:ring-[#6b1029]/10"
          />
        </div>
        {batches.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={batch === "ALL"} onClick={() => setBatch("ALL")}>
              All batches ({posts.length})
            </FilterChip>
            {batches.map((b) => (
              <FilterChip key={b} active={batch === b} onClick={() => setBatch(b)}>
                {b} ({posts.filter((p) => p.batchName === b).length})
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title={posts.length === 0 ? "No announcements yet" : "No announcements match your search"}
            description={posts.length === 0 ? "Updates from your faculty will show up here." : "Try a different keyword or filter."}
          />
        </Card>
      ) : (
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="relative space-y-3">
          {/* Timeline rail — decorative, sits behind the cards on wider screens. */}
          <span aria-hidden="true" className="absolute left-[19px] top-4 hidden w-px bg-zinc-200 sm:block" style={{ height: "calc(100% - 2rem)" }} />
          {filtered.map((p) => (
            <motion.li key={p.id} variants={itemVariants} className="relative">
              <Card className="p-4 sm:pl-12">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-6 hidden h-3 w-3 rounded-full border-2 border-white bg-[#6b1029] ring-1 ring-zinc-200 sm:block"
                />
                <div className="flex items-start gap-3">
                  <Avatar name={p.facultyName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-zinc-900">{p.title}</p>
                      <span className="rounded-full bg-[#6b1029]/[0.08] px-2 py-0.5 text-[10.5px] font-medium text-[#6b1029]">
                        {p.batchName}
                      </span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-zinc-400">
                      <span className="font-medium text-zinc-500">{p.facultyName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1" title={p.postedOn}>
                        <Clock size={11} /> {p.relative}
                      </span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">{p.body}</p>
                    {p.attachmentUrl && <a href={p.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#6b1029] hover:underline"><FileText size={13} /> {p.attachmentName ?? "View attached PDF"}</a>}
                  </div>
                </div>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
