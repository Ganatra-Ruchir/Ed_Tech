"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 text-rose-600"><AlertTriangle size={22} /></span>
        <h1 className="mt-5 text-2xl font-semibold text-[#17212b]">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">The page could not be loaded. Your data is safe, and you can try again.</p>
        <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#17212b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263441]"><RefreshCw size={15} /> Try again</button>
      </div>
    </div>
  );
}
