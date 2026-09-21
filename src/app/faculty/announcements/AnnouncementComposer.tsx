"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FileUp, ImagePlus, Megaphone, Pin, CheckSquare, MessageSquare, Palette, X } from "lucide-react";
import { Card } from "@/components/Card";
import { Select, Input, Textarea } from "@/components/Field";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { ANNOUNCEMENT_BACKGROUNDS, ANNOUNCEMENT_CATEGORIES } from "@/lib/announcement-types";
import { validateAvatarUpload, validateDocumentUpload, DOCUMENT_ACCEPT, IMAGE_ACCEPT } from "@/lib/uploads";

function Toggle({
  on, onClick, icon: Icon, label,
}: {
  on: boolean; onClick: () => void; icon: typeof Pin; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        on ? "border-[#ef5b3f]/30 bg-[#ef5b3f]/[0.06] text-[#ef5b3f]" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50",
      )}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

export function AnnouncementComposer({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [category, setCategory] = useState<string>("GENERAL");
  const [backgroundTheme, setBackgroundTheme] = useState("PLAIN");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [requireAck, setRequireAck] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const bannerPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (bannerPreviewRef.current) URL.revokeObjectURL(bannerPreviewRef.current);
    };
  }, []);

  function selectBanner(nextBanner: File | null) {
    if (bannerPreviewRef.current) URL.revokeObjectURL(bannerPreviewRef.current);
    const preview = nextBanner ? URL.createObjectURL(nextBanner) : null;
    bannerPreviewRef.current = preview;
    setBanner(nextBanner);
    setBannerPreview(preview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!batchId || !title.trim() || !body.trim()) {
      setError("Batch, title, and message are all required.");
      return;
    }
    if (file) {
      const err = validateDocumentUpload({ name: file.name, size: file.size });
      if (err) { setError(err); return; }
    }
    if (banner) {
      const err = validateAvatarUpload({ name: banner.name, size: banner.size });
      if (err) { setError(err); return; }
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("batchId", batchId);
      fd.set("category", category);
      fd.set("backgroundTheme", backgroundTheme);
      fd.set("title", title);
      fd.set("body", body);
      fd.set("pinned", String(pinned));
      fd.set("requireAck", String(requireAck));
      fd.set("allowComments", String(allowComments));
      if (file) fd.set("file", file);
      if (banner) fd.set("banner", banner);
      const res = await fetch("/api/announcements", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post announcement"); return; }
      setTitle(""); setBody(""); setFile(null); selectBanner(null); setBackgroundTheme("PLAIN"); setPinned(false); setRequireAck(false); setDesignOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      if (bannerRef.current) bannerRef.current.value = "";
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
          <Megaphone size={15} className="text-[#ef5b3f]" /> New announcement
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Write an update for the class…" />

        <div>
          <button
            type="button"
            onClick={() => setDesignOpen((open) => !open)}
            aria-expanded={designOpen}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
              designOpen || backgroundTheme !== "PLAIN" || banner ? "border-[#ef5b3f]/30 bg-[#fff8f5] text-[#d9472e]" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
            )}
          >
            <Palette size={14} /> Edit design
            {!designOpen && (backgroundTheme !== "PLAIN" || banner) && <span className="font-normal text-[#667085]">· Design added</span>}
          </button>

          <AnimatePresence initial={false}>
            {designOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-4 rounded-md border border-[#e1e5de] bg-[#f8f9f6] p-4">
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold text-zinc-700">Background color</legend>
                    <div className="flex flex-wrap gap-2">
                      {ANNOUNCEMENT_BACKGROUNDS.map((background) => (
                        <button
                          key={background.value}
                          type="button"
                          title={background.label}
                          aria-label={`${background.label} background`}
                          aria-pressed={backgroundTheme === background.value}
                          onClick={() => setBackgroundTheme(background.value)}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-md border transition-transform hover:scale-105",
                            backgroundTheme === background.value ? "border-[#ef5b3f] ring-2 ring-[#ef5b3f]/20" : "border-zinc-200",
                            background.swatch,
                          )}
                        >
                          {background.value === "PLAIN" && <span className="h-2 w-2 rounded-full bg-zinc-300" />}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {bannerPreview && <div className="relative overflow-hidden rounded-md border border-zinc-200 bg-white">
                    {/* Object URLs are local previews and cannot use the Next image optimizer. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bannerPreview} alt="Selected announcement banner preview" className="h-32 w-full object-cover" />
                    <button type="button" onClick={() => { selectBanner(null); if (bannerRef.current) bannerRef.current.value = ""; }} aria-label="Remove banner" title="Remove banner" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-zinc-700 shadow-sm hover:bg-white"><X size={14} /></button>
                  </div>}

                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-600 hover:border-[#ef5b3f]/40">
                    <ImagePlus size={14} className="text-[#ef5b3f]" />
                    <span className="truncate">{banner?.name ?? "Add banner image (PNG, JPG, WEBP or GIF · up to 5 MB)"}</span>
                    <input ref={bannerRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => selectBanner(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:border-[#ef5b3f]/40">
          <FileUp size={14} className="text-[#ef5b3f]" />
          <span className="truncate">{file?.name ?? "Attach a file (PDF, DOC, image, zip… up to 25 MB)"}</span>
          <input ref={fileRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Toggle on={pinned} onClick={() => setPinned((v) => !v)} icon={Pin} label="Pin to top" />
          <Toggle on={requireAck} onClick={() => setRequireAck((v) => !v)} icon={CheckSquare} label="Require acknowledgment" />
          <Toggle on={allowComments} onClick={() => setAllowComments((v) => !v)} icon={MessageSquare} label="Allow replies" />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={submitting} size="sm" className="!bg-[#ef5b3f] hover:!bg-[#d9472e]">
          {submitting ? "Posting…" : "Post to class stream"}
        </Button>
      </form>
    </Card>
  );
}
