"use client";

import { useMemo, useState } from "react";
import { Download, FileText, LibraryBig, Search } from "lucide-react";
import { Input } from "@/components/Field";
import type { LearningMaterialDTO } from "@/lib/materials";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MaterialLibrary({ materials }: { materials: LearningMaterialDTO[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");
  const subjects = useMemo(() => [...new Set(materials.map((material) => material.subject))].sort((a, b) => a.localeCompare(b)), [materials]);
  const visible = materials.filter((material) => {
    if (subject !== "ALL" && material.subject !== subject) return false;
    const value = query.trim().toLowerCase();
    return !value || material.title.toLowerCase().includes(value) || material.description?.toLowerCase().includes(value) || material.fileName.toLowerCase().includes(value);
  });
  const grouped = subjects
    .map((name) => ({ name, materials: visible.filter((material) => material.subject === name) }))
    .filter((group) => group.materials.length > 0);

  if (materials.length === 0) {
    return <div className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-14 text-center"><LibraryBig size={26} className="mx-auto text-[#98a2b3]" /><p className="mt-3 text-sm font-medium text-[#475467]">No study materials have been uploaded yet.</p></div>;
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 rounded-md border border-[#dfe3dc] bg-white p-3 shadow-sm">
      <div className="relative min-w-[220px] flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials..." className="pl-9" /></div>
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-[#d6dbd3] bg-[#f7f8f5] p-1">
        {["ALL", ...subjects].map((value) => <button key={value} type="button" onClick={() => setSubject(value)} className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-colors ${subject === value ? "bg-[#17212b] text-white" : "text-[#667085] hover:bg-white"}`}>{value === "ALL" ? "All subjects" : value}</button>)}
      </div>
    </div>

    {grouped.length === 0 ? <p className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-12 text-center text-sm text-[#667085]">No materials match this search.</p> : grouped.map((group) => <section key={group.name}>
      <div className="mb-3 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ef5b3f]/10 text-[#d9472e]"><LibraryBig size={14} /></span><h2 className="text-sm font-semibold text-[#17212b]">{group.name}</h2><span className="text-xs text-[#98a2b3]">{group.materials.length}</span></div>
      <div className="grid gap-3 lg:grid-cols-2">{group.materials.map((material) => <article key={material.id} className="flex min-w-0 gap-3 rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f1f3ef] text-[#475467]"><FileText size={18} /></span>
        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#17212b]">{material.title}</h3><p className="mt-0.5 text-[11px] text-[#667085]">{material.batchName} · {material.facultyName}</p></div><a href={material.fileUrl} target="_blank" rel="noreferrer" title={`Open ${material.fileName}`} aria-label={`Open ${material.title}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#d6dbd3] text-[#d9472e] hover:bg-[#fff8f5]"><Download size={14} /></a></div>{material.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#475467]">{material.description}</p>}<p className="mt-2 truncate text-[10px] text-[#98a2b3]">{material.fileName} · {formatSize(material.fileSize)} · {new Date(material.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
      </article>)}</div>
    </section>)}
  </div>;
}
