"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Mail } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#6b1029]/[0.04] via-zinc-50 to-zinc-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6b1029] text-white shadow-sm shadow-[#6b1029]/20">
            <GraduationCap size={24} />
          </span>
          <h1 className="text-xl font-semibold text-zinc-900">Student Progress &amp; Evaluation Platform</h1>
          <p className="mt-1 text-sm text-zinc-500">Silver Oak University — sign in to your portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-md shadow-zinc-200/60"
        >
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-[#6b1029] focus:outline-none focus:ring-2 focus:ring-[#6b1029]/15"
                placeholder="you@sou.edu"
              />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-zinc-700">Password</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-[#6b1029] focus:outline-none focus:ring-2 focus:ring-[#6b1029]/15"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#6b1029] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#7c1638] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}
