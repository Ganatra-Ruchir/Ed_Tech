"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

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
    <Button onClick={toggle} disabled={busy} variant={published ? "secondary" : "primary"} size="sm">
      {published ? "Unpublish" : "Publish to batch"}
    </Button>
  );
}
