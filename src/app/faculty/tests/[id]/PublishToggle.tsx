"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishToggle({ testId, published }: { testId: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !published }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        published
          ? "border border-slate-300 text-slate-700 hover:bg-slate-100"
          : "bg-indigo-600 text-white hover:bg-indigo-500"
      }`}
    >
      {published ? "Unpublish" : "Publish to batch"}
    </button>
  );
}
