import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f0] px-5">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#ef5b3f]/10 text-[#d9472e]"><Compass size={22} /></span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef5b3f]">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#17212b]">This page could not be found</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">The link may be outdated, or you may not have access to this destination.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#17212b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263441]"><ArrowLeft size={15} /> Return home</Link>
      </div>
    </main>
  );
}
