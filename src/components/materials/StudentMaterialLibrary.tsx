"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  LibraryBig,
  Presentation,
  Search,
  UserRound,
} from "lucide-react";
import type { LearningMaterialDTO } from "@/lib/materials";
import { cn } from "@/lib/cn";

type FileKind = "PDF" | "PRESENTATION" | "DOCUMENT" | "SHEET" | "OTHER";
type SortMode = "LATEST" | "OLDEST" | "TITLE";

const FILE_KINDS: { value: "ALL" | FileKind; label: string }[] = [
  { value: "ALL", label: "All types" },
  { value: "PDF", label: "PDF" },
  { value: "PRESENTATION", label: "Slides" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "SHEET", label: "Sheets" },
  { value: "OTHER", label: "Other" },
];

function fileKind(material: LearningMaterialDTO): FileKind {
  const value = `${material.fileName} ${material.fileType}`.toLowerCase();
  if (value.includes("pdf")) return "PDF";
  if (/ppt|presentation|powerpoint/.test(value)) return "PRESENTATION";
  if (/doc|text|word|rtf/.test(value)) return "DOCUMENT";
  if (/xls|sheet|csv/.test(value)) return "SHEET";
  return "OTHER";
}

function fileIcon(kind: FileKind) {
  if (kind === "PRESENTATION") return { Icon: Presentation, color: "bg-[#fff0e8] text-[#e25822]" };
  if (kind === "PDF") return { Icon: FileText, color: "bg-[#ffe9ec] text-[#d9233f]" };
  if (kind === "DOCUMENT") return { Icon: FileText, color: "bg-[#eaf2ff] text-[#286bd8]" };
  if (kind === "SHEET") return { Icon: FileSpreadsheet, color: "bg-[#e7f8ed] text-[#14834b]" };
  return { Icon: FileArchive, color: "bg-[#f1edff] text-[#6941c6]" };
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function StudentMaterialLibrary({ materials, userId }: { materials: LearningMaterialDTO[]; userId: string }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");
  const [kind, setKind] = useState<"ALL" | FileKind>("ALL");
  const [sort, setSort] = useState<SortMode>("LATEST");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const storageKey = `student-materials:saved:${userId}`;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
        if (Array.isArray(value)) setSaved(new Set(value.filter((id): id is string => typeof id === "string")));
      } catch {
        setSaved(new Set());
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, [storageKey]);

  const subjects = useMemo(
    () => [...new Set(materials.map((material) => material.subject))].sort((a, b) => a.localeCompare(b)),
    [materials],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return materials
      .filter((material) => subject === "ALL" || material.subject === subject)
      .filter((material) => kind === "ALL" || fileKind(material) === kind)
      .filter((material) => !term || [material.title, material.description, material.fileName, material.facultyName, material.subject].some((value) => value?.toLowerCase().includes(term)))
      .sort((a, b) => {
        if (sort === "TITLE") return a.title.localeCompare(b.title);
        const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return sort === "LATEST" ? difference : -difference;
      });
  }, [kind, materials, query, sort, subject]);

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  if (materials.length === 0) {
    return <div className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-16 text-center"><LibraryBig size={28} className="mx-auto text-[#98a2b3]" /><p className="mt-3 text-sm font-semibold text-[#344054]">Your material library is empty</p><p className="mt-1 text-xs text-[#667085]">Resources shared with your batch will appear here.</p></div>;
  }

  return <div className="space-y-6">
    <section aria-label="Material filters" className="space-y-3 border-b border-[#e1e5de] pb-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_170px]">
        <label className="relative block">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, subject, or faculty..." className="h-11 w-full rounded-md border border-[#d6dbd3] bg-white pl-10 pr-3 text-sm text-[#17212b] outline-none transition focus:border-[#a43f31] focus:ring-2 focus:ring-[#a43f31]/10" />
        </label>
        <select value={kind} onChange={(event) => setKind(event.target.value as "ALL" | FileKind)} className="h-11 rounded-md border border-[#d6dbd3] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#a43f31]">
          {FILE_KINDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-11 rounded-md border border-[#d6dbd3] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#a43f31]">
          <option value="LATEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="TITLE">Title A-Z</option>
        </select>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["ALL", ...subjects].map((value) => <button key={value} type="button" onClick={() => setSubject(value)} className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition", subject === value ? "border-[#8c1d2c] bg-[#8c1d2c] text-white shadow-sm" : "border-[#dfe3dc] bg-white text-[#475467] hover:border-[#b9c0b6] hover:bg-[#f8f9f6]")}>{value === "ALL" ? "All subjects" : value}</button>)}
      </div>
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div><div className="flex items-center gap-2"><BookOpen size={19} className="text-[#8c1d2c]" /><h2 className="text-lg font-bold text-[#17212b]">Materials</h2></div><p className="mt-0.5 text-xs text-[#667085]">{visible.length} {visible.length === 1 ? "resource" : "resources"} available</p></div>
        {(subject !== "ALL" || kind !== "ALL" || query) && <button type="button" onClick={() => { setQuery(""); setSubject("ALL"); setKind("ALL"); }} className="text-xs font-semibold text-[#8c1d2c] hover:underline">Clear filters</button>}
      </div>

      {visible.length === 0 ? <div className="rounded-md border border-dashed border-[#cbd1c8] bg-white px-5 py-12 text-center text-sm text-[#667085]">No materials match these filters.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((material) => {
          const materialKind = fileKind(material);
          const { Icon, color } = fileIcon(materialKind);
          const isSaved = saved.has(material.id);
          return <article id={`material-${material.id}`} key={material.id} className="group flex min-h-[238px] flex-col rounded-md border border-[#dfe3dc] bg-white p-4 shadow-[0_2px_8px_rgba(23,33,43,0.04)] transition hover:-translate-y-0.5 hover:border-[#c7cec4] hover:shadow-[0_8px_20px_rgba(23,33,43,0.08)]">
            <div className="flex items-start gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", color)}><Icon size={20} /></span>
              <div className="min-w-0 flex-1"><span className="inline-flex max-w-full rounded-full bg-[#f5f1ed] px-2.5 py-1 text-[10px] font-semibold text-[#8c1d2c]"><span className="truncate">{material.subject}</span></span><h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-[#17212b]">{material.title}</h3></div>
              <button type="button" onClick={() => toggleSaved(material.id)} title={isSaved ? "Remove bookmark" : "Save material"} aria-label={isSaved ? `Remove ${material.title} from saved materials` : `Save ${material.title}`} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition", isSaved ? "border-[#e6bc63] bg-[#fff8e6] text-[#b87800]" : "border-transparent text-[#98a2b3] hover:border-[#dfe3dc] hover:text-[#475467]")}><Bookmark size={16} fill={isSaved ? "currentColor" : "none"} /></button>
            </div>
            {material.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#667085]">{material.description}</p>}
            <div className="mt-auto space-y-2 pt-4 text-[11px] text-[#667085]">
              <div className="flex flex-wrap gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1.5"><UserRound size={13} /> {material.facultyName}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {formatDate(material.createdAt)}</span></div>
              <p className="truncate font-medium text-[#475467]">{material.fileName} <span className="font-normal text-[#98a2b3]">· {formatSize(material.fileSize)}</span></p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#edf0eb] pt-3">
              <a href={material.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#8c1d2c] text-xs font-semibold text-white transition hover:bg-[#741522]"><Eye size={14} /> Preview</a>
              <a href={material.fileUrl} download={material.fileName} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#c9a0a6] text-xs font-semibold text-[#8c1d2c] transition hover:bg-[#fff7f8]"><Download size={14} /> Download</a>
            </div>
          </article>;
        })}
      </div>}
    </section>

    <section className="border-t border-[#e1e5de] pt-5">
      <div className="mb-3 flex items-center gap-2"><LibraryBig size={18} className="text-[#8c1d2c]" /><h2 className="text-base font-bold text-[#17212b]">Browse by subject</h2></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{subjects.map((name, index) => {
        const count = materials.filter((material) => material.subject === name).length;
        const colors = ["bg-[#fff0f0] text-[#9f2435]", "bg-[#edf4ff] text-[#245fbd]", "bg-[#ebf8ef] text-[#237747]", "bg-[#f4efff] text-[#6541aa]"];
        return <button type="button" key={name} onClick={() => { setSubject(name); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cn("flex min-h-16 items-center justify-between rounded-md border border-transparent px-4 text-left transition hover:border-current/15", colors[index % colors.length])}><span><span className="block text-sm font-bold">{name}</span><span className="mt-0.5 block text-[11px] opacity-70">{count} {count === 1 ? "resource" : "resources"}</span></span><BookOpen size={18} /></button>;
      })}</div>
    </section>

    <section className="grid grid-cols-3 divide-x divide-[#e1e5de] rounded-md border border-[#dfe3dc] bg-white py-4 text-center shadow-sm">
      <div><p className="text-xl font-bold text-[#17212b]">{materials.length}</p><p className="text-[11px] text-[#667085]">Resources</p></div>
      <div><p className="text-xl font-bold text-[#17212b]">{subjects.length}</p><p className="text-[11px] text-[#667085]">Subjects</p></div>
      <div><p className="text-xl font-bold text-[#17212b]">{saved.size}</p><p className="text-[11px] text-[#667085]">Saved</p></div>
    </section>
  </div>;
}
