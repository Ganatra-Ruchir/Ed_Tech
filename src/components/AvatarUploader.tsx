"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { IMAGE_ACCEPT, validateAvatarUpload } from "@/lib/uploads";

/**
 * Self-contained profile-picture control: shows the current avatar (image or
 * initials), lets the user pick a PNG/JPG/WEBP/GIF, uploads it to
 * /api/profile/avatar, and refreshes so the new image appears everywhere the
 * Avatar is rendered.
 */
export function AvatarUploader({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(imageUrl);

  async function onPick(file: File | undefined) {
    if (!file) return;
    const err = validateAvatarUpload({ name: file.name, size: file.size });
    if (err) { setError(err); return; }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Upload failed"); return; }
      setPreview(data.url);
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (res.ok) { setPreview(null); router.refresh(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} imageUrl={preview} size="lg" />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
            <Loader2 size={16} className="animate-spin text-[#ef5b3f]" />
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#ef5b3f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#d9472e] disabled:opacity-60"
          >
            <Camera size={13} /> {preview ? "Change photo" : "Upload photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
            >
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-400">PNG, JPG, WEBP or GIF · up to 5 MB</p>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
        <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
