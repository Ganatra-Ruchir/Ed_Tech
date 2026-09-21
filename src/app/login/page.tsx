"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, BarChart3, GraduationCap, Lock, Mail, Users } from "lucide-react";

const HERO_IMAGES = [
  "/campus-gate.png",
  "/campus-airplane.png",
  "/campus-building.png",
  "/campus-institute.png",
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [heroImage, setHeroImage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImage((current) => (current + 1) % HERO_IMAGES.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

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
    <main className="grid min-h-screen bg-[#f7f8f5] lg:grid-cols-[minmax(420px,0.88fr)_1.12fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(145deg,#241719_0%,#3b1d25_48%,#6f3039_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute inset-0" aria-hidden="true">
          {HERO_IMAGES.map((source, index) => (
            <Image
              key={source}
              src={source}
              alt=""
              fill
              sizes="58vw"
              priority={index === 0}
              className={`object-cover transition-opacity duration-700 ease-out ${index === heroImage ? "opacity-75" : "opacity-0"}`}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,23,25,0.82)_0%,rgba(59,29,37,0.42)_43%,rgba(59,29,37,0.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(36,23,25,0.58)_0%,transparent_58%,rgba(36,23,25,0.1)_100%)]" />
        </div>
        <div className="pointer-events-none absolute -right-28 top-1/4 h-[32rem] w-[32rem] rounded-full border border-[#0b7a50]/20 bg-[#0b7a50]/10 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="animate-brand-breathe flex h-11 w-11 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"><Image src="/silver-oak-logo.png" alt="Silver Oak University" width={44} height={44} className="h-full w-full object-contain" priority /></span>
          <div>
            <p className="text-sm font-semibold">Silver Oak University</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">Learning Hub</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center py-10">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d7a3a4]">Education for a brighter tomorrow</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] xl:text-6xl">
            Learn. <span className="text-[#d8a6a7]">Grow.</span><br />Achieve.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-white/70">A unified learning platform for students, faculty, and administrators at Silver Oak University.</p>
          <div className="mt-9 grid max-w-md gap-4">
            {[
              [GraduationCap, "Access learning resources", "Notes, assignments, exams and more in one place."],
              [Users, "Stay connected", "Seamless communication across your university community."],
              [BarChart3, "Build your future", "Track progress, gain insights, and reach your goals."],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof GraduationCap;
              return <div key={title as string} className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8f3032] text-white shadow-[0_8px_22px_rgba(0,0,0,0.16)]"><FeatureIcon size={18} /></span><span><strong className="block text-[13px] font-semibold text-white">{title as string}</strong><span className="mt-0.5 block text-[11px] leading-4 text-white/55">{description as string}</span></span></div>;
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/30">
          <span>Silver Oak University</span>
          <span>Ahmedabad, Gujarat</span>
        </div>
        <div className="absolute -bottom-24 -right-12 select-none text-[19rem] font-bold leading-none tracking-[-0.08em] text-white/[0.025]" aria-hidden="true">SO</div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[520px] rounded-2xl border border-[#e4e7e0] bg-white p-6 shadow-[0_22px_70px_rgba(36,23,25,0.08)] sm:p-10">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
          <span className="animate-brand-breathe flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"><Image src="/silver-oak-logo.png" alt="Silver Oak University" width={40} height={40} className="h-full w-full object-contain" /></span>
            <div><p className="text-sm font-semibold text-[#17212b]">Silver Oak University</p><p className="text-[10px] uppercase tracking-[0.14em] text-[#667085]">Learning Hub</p></div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef5b3f]">Welcome back</p>
            <h2 className="text-[30px] font-semibold tracking-[-0.02em] text-[#17212b]">Sign in to your portal</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">Use your university account to continue to Silver Oak University Learning Hub.</p>
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

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#8f3032] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(143,48,50,0.18)] hover:bg-[#74272a] disabled:cursor-not-allowed disabled:opacity-60">
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
