"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f4f5f0] lg:grid-cols-[minmax(360px,0.82fr)_1.18fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#241719] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="relative z-10 flex items-center gap-3">
          <span className="animate-brand-breathe flex h-11 w-11 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"><Image src="/silver-oak-logo.png" alt="Silver Oak University" width={44} height={44} className="h-full w-full object-contain" priority /></span>
          <div>
            <p className="text-sm font-semibold">Silver Oak University</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">Learning Hub</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/15 bg-white p-2 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <Image src="/silver-oak-login-visual.png" alt="Silver Oak University" width={1518} height={615} className="h-auto w-full rounded-xl object-cover" priority />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/30">
          <span>Silver Oak University</span>
          <span>Ahmedabad, Gujarat</span>
        </div>
        <div className="absolute -bottom-24 -right-12 select-none text-[19rem] font-bold leading-none tracking-[-0.08em] text-white/[0.025]" aria-hidden="true">SO</div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
          <span className="animate-brand-breathe flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"><Image src="/silver-oak-logo.png" alt="Silver Oak University" width={40} height={40} className="h-full w-full object-contain" /></span>
            <div><p className="text-sm font-semibold text-[#17212b]">Silver Oak University</p><p className="text-[10px] uppercase tracking-[0.14em] text-[#667085]">Learning Hub</p></div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef5b3f]">Welcome back</p>
            <h2 className="text-[30px] font-semibold tracking-[-0.02em] text-[#17212b]">Sign in to your portal</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">Use your university account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[#475467]">University email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
                <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-[#d6dbd3] bg-white py-3 pl-10 pr-3 text-sm text-[#17212b] shadow-sm placeholder:text-[#98a2b3] focus:border-[#ef5b3f] focus:outline-none focus:ring-3 focus:ring-[#ef5b3f]/10" placeholder="you@sou.edu" />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-[#475467]">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
                <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-[#d6dbd3] bg-white py-3 pl-10 pr-3 text-sm text-[#17212b] shadow-sm placeholder:text-[#98a2b3] focus:border-[#ef5b3f] focus:outline-none focus:ring-3 focus:ring-[#ef5b3f]/10" placeholder="Enter your password" />
              </div>
            </div>

            {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#17212b] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#263441] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#98a2b3]">Access is limited to registered students, faculty, and administrators.</p>
        </div>
      </section>
    </main>
  );
}
